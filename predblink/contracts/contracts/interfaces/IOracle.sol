// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOracle
 * @notice Minimal oracle interface that all data-source adapters implement.
 *         PredBlink queries this to snapshot values at market creation and
 *         MarketResolver queries this to fetch final values at resolution.
 *
 *  Feed ID convention (bytes32, built off-chain with keccak256):
 *    Price  →  keccak256("BTC/USD")   keccak256("ETH/USD")
 *    Block  →  keccak256("GAS_PRICE") keccak256("BASE_FEE")
 *    Tweet  →  keccak256("TWEET:<id>:<metric>")
 */
interface IOracle {
    event FeedUpdated(bytes32 indexed feedId, uint256 value, uint256 timestamp);

    /// @notice Whether this adapter can service `feedId`
    function isSupported(bytes32 feedId) external view returns (bool);

    /// @notice Latest value for a feed
    /// @return value     Data point (price 8-dec, wei, count, …)
    /// @return updatedAt Timestamp of the last update
    function getLatestValue(bytes32 feedId)
        external
        view
        returns (uint256 value, uint256 updatedAt);
}
