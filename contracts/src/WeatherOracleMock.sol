// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract WeatherOracleMock {
    error WeatherOracleMock__NotOwner();

    address public owner;
    uint256 public lastRainfall;
    uint256 public lastUpdatedTimestamp;

    event WeatherUpdated(uint256 rainfall);
    event WeatherTimestampUpdated(uint256 timestamp);

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert WeatherOracleMock__NotOwner();
        }
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function updateWeather(uint256 rainfall) external onlyOwner {
        lastRainfall = rainfall;
        emit WeatherUpdated(rainfall);
    }
}
