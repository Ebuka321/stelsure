// SPDX-License-Identifier: MIT
// PolicyManager handles crop insurance policies on Stellar
pragma solidity ^0.8.19;

contract PolicyManager {
    error PolicyManager__IncorrectPremium();
    error PolicyManager__NotOwner();
    error PolicyManager__NotReactiveArbitrator();
    error PolicyManager__PolicyInactive();
    error PolicyManager__InsufficientVaultFunds();
    error PolicyManager__TransferFailed();
    error PolicyManager__ZeroAddress();

    struct Policy {
        address user;
        uint256 premium;
        uint256 payout;
        uint256 threshold;
        bool active;
    }

    uint256 public constant PREMIUM = 0.1 ether;
    uint256 public constant PAYOUT = 1 ether;
    uint256 public constant THRESHOLD = 100;

    address public owner;
    address public reactiveArbitrator;

    Policy[] public policies;
    mapping(uint256 => uint256[]) public policiesByThreshold;

    event PolicyCreated(uint256 indexed policyId, address indexed user, uint256 premium, uint256 threshold);
    event PolicyPaidOut(uint256 indexed policyId, address indexed user, uint256 amount);
    event ReactiveArbitratorSet(address indexed arbitrator);
    event VaultFunded(address indexed funder, uint256 amount);
    event VaultWithdrawn(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert PolicyManager__NotOwner();
        }
        _;
    }

    modifier onlyReactiveArbitrator() {
        if (msg.sender != reactiveArbitrator) {
            revert PolicyManager__NotReactiveArbitrator();
        }
        _;
    }

    constructor(address _owner) {
        if (_owner == address(0)) {
            revert PolicyManager__ZeroAddress();
        }

        owner = _owner;
    }

    function createPolicy() external payable returns (uint256 policyId) {
        if (msg.value != PREMIUM) {
            revert PolicyManager__IncorrectPremium();
        }

        policyId = policies.length;
        policies.push(
            Policy({user: msg.sender, premium: PREMIUM, payout: PAYOUT, threshold: THRESHOLD, active: true})
        );
        policiesByThreshold[THRESHOLD].push(policyId);

        emit PolicyCreated(policyId, msg.sender, PREMIUM, THRESHOLD);
    }

    function setReactiveArbitrator(address arbitrator) external onlyOwner {
        if (arbitrator == address(0)) {
            revert PolicyManager__ZeroAddress();
        }

        reactiveArbitrator = arbitrator;
        emit ReactiveArbitratorSet(arbitrator);
    }

    function fundVault() external payable {
        emit VaultFunded(msg.sender, msg.value);
    }

    function withdrawVault(address payable recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) {
            revert PolicyManager__ZeroAddress();
        }
        if (amount > address(this).balance) {
            revert PolicyManager__InsufficientVaultFunds();
        }

        (bool success,) = recipient.call{value: amount}("");
        if (!success) {
            revert PolicyManager__TransferFailed();
        }

        emit VaultWithdrawn(recipient, amount);
    }

    function payout(uint256 policyId) external onlyReactiveArbitrator {
        Policy storage policy = policies[policyId];

        if (!policy.active) {
            revert PolicyManager__PolicyInactive();
        }
        if (address(this).balance < policy.payout) {
            revert PolicyManager__InsufficientVaultFunds();
        }

        policy.active = false;

        (bool success,) = payable(policy.user).call{value: policy.payout}("");
        if (!success) {
            revert PolicyManager__TransferFailed();
        }

        emit PolicyPaidOut(policyId, policy.user, policy.payout);
    }

    function getPoliciesByThreshold(uint256 threshold) external view returns (uint256[] memory) {
        return policiesByThreshold[threshold];
    }

    function getPolicies() external view returns (Policy[] memory) {
        return policies;
    }

    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
