// SPDX-License-Identifier: MIT
// ReactiveArbitrator handles automated payout distribution
pragma solidity ^0.8.19;

import {SomniaEventHandler} from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import {PolicyManager} from "./PolicyManager.sol";

contract ReactiveArbitrator is SomniaEventHandler {
    error ReactiveArbitrator__UnexpectedEmitter(address emitter);
    error ReactiveArbitrator__ThresholdMismatch(uint256 threshold);
    error ReactiveArbitrator__ZeroPayout();

    PolicyManager public immutable policyManager;
    address public immutable weatherOracle;
    uint256 public immutable trackedThreshold;
    uint256 public lastObservedRainfall;

    event ReactiveWeatherHandled(address indexed emitter, uint256 rainfall, uint256 payoutsTriggered);

    constructor(
        address _systemCaller,
        address _policyManager,
        address _weatherOracle,
        uint256 _trackedThreshold
    ) SomniaEventHandler(_systemCaller) {
        policyManager = PolicyManager(_policyManager);
        weatherOracle = _weatherOracle;
        trackedThreshold = _trackedThreshold;
    }

    function previewHandleWeather(uint256 rainfall) external returns (uint256) {
        return _handleWeather(weatherOracle, rainfall);
    }

    function _onEvent(address emitter, bytes32[] calldata, bytes calldata data) internal override {
        uint256 rainfall = abi.decode(data, (uint256));
        _handleWeather(emitter, rainfall);
    }

    function _handleWeather(address emitter, uint256 rainfall) internal returns (uint256 payoutsTriggered) {
        if (emitter != weatherOracle) {
            revert ReactiveArbitrator__UnexpectedEmitter(emitter);
        }

        lastObservedRainfall = rainfall;

        if (trackedThreshold != policyManager.THRESHOLD()) {
            revert ReactiveArbitrator__ThresholdMismatch(trackedThreshold);
        }

        if (rainfall < trackedThreshold) {
            emit ReactiveWeatherHandled(emitter, rainfall, 0);
            return 0;
        }

        uint256[] memory policyIds = policyManager.getPoliciesByThreshold(trackedThreshold);
        uint256 policyIdsLength = policyIds.length;
        for (uint256 index = 0; index < policyIdsLength; ++index) {
            (address user,, uint256 payoutAmount, uint256 threshold, bool active) = policyManager.policies(
                policyIds[index]
            );
            if (user != address(0) && active && payoutAmount > 0 && threshold == trackedThreshold) {
                policyManager.payout(policyIds[index]);
                payoutsTriggered++;
            }
        }

        emit ReactiveWeatherHandled(emitter, rainfall, payoutsTriggered);
    }
}
