// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {WeatherOracleMock} from "../src/WeatherOracleMock.sol";
import {PolicyManager} from "../src/PolicyManager.sol";
import {ReactiveArbitrator} from "../src/ReactiveArbitrator.sol";

contract BuyerActor {
    receive() external payable {}

    function buyPolicy(PolicyManager policyManager) external payable returns (uint256) {
        return policyManager.createPolicy{value: msg.value}();
    }
}

contract PolicyManagerTest is Test {
    address internal owner = makeAddr("owner");
    address internal fakeSystemCaller = makeAddr("stellarSystem");

    WeatherOracleMock internal oracle;
    PolicyManager internal policyManager;
    ReactiveArbitrator internal arbitrator;
    BuyerActor internal farmer;
    BuyerActor internal secondFarmer;

    function setUp() public {
        oracle = new WeatherOracleMock(owner);
        policyManager = new PolicyManager(owner);
        arbitrator = new ReactiveArbitrator(fakeSystemCaller, address(policyManager), address(oracle), policyManager.THRESHOLD());
        farmer = new BuyerActor();
        secondFarmer = new BuyerActor();

        vm.prank(owner);
        policyManager.setReactiveArbitrator(address(arbitrator));

        vm.deal(address(farmer), 10 ether);
        vm.deal(address(secondFarmer), 10 ether);
        vm.deal(owner, 10 ether);
    }

    function testCreatePolicyWithExactPremium() public {
        uint256 policyId = farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        (address user, uint256 premium, uint256 payoutAmount, uint256 threshold, bool active) =
            policyManager.policies(policyId);

        assertEq(user, address(farmer));
        assertEq(premium, policyManager.PREMIUM());
        assertEq(payoutAmount, policyManager.PAYOUT());
        assertEq(threshold, policyManager.THRESHOLD());
        assertTrue(active);
    }

    function testCreatePolicyWithWrongPremiumReverts() public {
        vm.expectRevert(PolicyManager.PolicyManager__IncorrectPremium.selector);
        farmer.buyPolicy{value: 0.2 ether}(policyManager);
    }

    function testMultiplePoliciesPerWalletAllowed() public {
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        uint256[] memory policyIds = policyManager.getPoliciesByThreshold(policyManager.THRESHOLD());
        assertEq(policyIds.length, 2);
    }

    function testOnlyOwnerCanUpdateWeather() public {
        vm.prank(address(farmer));
        vm.expectRevert(WeatherOracleMock.WeatherOracleMock__NotOwner.selector);
        oracle.updateWeather(120);
    }

    function testOnlyOwnerCanSetArbitrator() public {
        vm.prank(address(farmer));
        vm.expectRevert(PolicyManager.PolicyManager__NotOwner.selector);
        policyManager.setReactiveArbitrator(makeAddr("newArbitrator"));
    }

    function testOnlyArbitratorCanPayout() public {
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        vm.prank(address(farmer));
        vm.expectRevert(PolicyManager.PolicyManager__NotReactiveArbitrator.selector);
        policyManager.payout(0);
    }

    function testUnderfundedVaultRevertsAndLeavesPolicyActive() public {
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        vm.expectRevert(PolicyManager.PolicyManager__InsufficientVaultFunds.selector);
        arbitrator.previewHandleWeather(120);

        (,,,, bool active) = policyManager.policies(0);
        assertTrue(active);
    }

    function testRainfallBelowThresholdDoesNotPayout() public {
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        vm.prank(owner);
        policyManager.fundVault{value: 2 ether}();

        arbitrator.previewHandleWeather(99);

        (,,,, bool active) = policyManager.policies(0);
        assertTrue(active);
    }

    function testEligiblePoliciesPayoutAndBecomeInactive() public {
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);
        secondFarmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        vm.prank(owner);
        policyManager.fundVault{value: 3 ether}();

        uint256 farmerBalanceBefore = address(farmer).balance;
        uint256 secondFarmerBalanceBefore = address(secondFarmer).balance;

        uint256 payoutsTriggered = arbitrator.previewHandleWeather(120);

        assertEq(payoutsTriggered, 2);
        assertEq(address(farmer).balance, farmerBalanceBefore + policyManager.PAYOUT());
        assertEq(address(secondFarmer).balance, secondFarmerBalanceBefore + policyManager.PAYOUT());

        (,,,, bool firstActive) = policyManager.policies(0);
        (,,,, bool secondActive) = policyManager.policies(1);
        assertFalse(firstActive);
        assertFalse(secondActive);
    }

    function testSecondPayoutAttemptFails() public {
        farmer.buyPolicy{value: policyManager.PREMIUM()}(policyManager);

        vm.prank(owner);
        policyManager.fundVault{value: 2 ether}();

        arbitrator.previewHandleWeather(120);

        vm.expectRevert(PolicyManager.PolicyManager__PolicyInactive.selector);
        vm.prank(address(arbitrator));
        policyManager.payout(0);
    }

    function testSystemCallerPathUpdatesLastObservedRainfall() public {
        vm.prank(owner);
        policyManager.fundVault{value: 2 ether}();

        vm.prank(fakeSystemCaller);
        arbitrator.onEvent(address(oracle), new bytes32[](0), abi.encode(uint256(120)));

        assertEq(arbitrator.lastObservedRainfall(), 120);
    }
}
