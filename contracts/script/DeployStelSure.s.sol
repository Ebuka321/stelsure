// SPDX-License-Identifier: MIT
// Deployment script for StelSure contracts
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {WeatherOracleMock} from "../src/WeatherOracleMock.sol";
import {PolicyManager} from "../src/PolicyManager.sol";
import {ReactiveArbitrator} from "../src/ReactiveArbitrator.sol";

contract DeployStelSureScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address systemCaller = vm.envAddress("STELLAR_SYSTEM_CALLER");

        vm.startBroadcast(deployerPrivateKey);

        WeatherOracleMock oracle = new WeatherOracleMock(owner);
        PolicyManager policyManager = new PolicyManager(owner);
        ReactiveArbitrator arbitrator =
            new ReactiveArbitrator(systemCaller, address(policyManager), address(oracle), policyManager.THRESHOLD());

        policyManager.setReactiveArbitrator(address(arbitrator));

        vm.stopBroadcast();
    }
}
