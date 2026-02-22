// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IOracle.sol";

/**
 * @title BlockOracle
 * @notice On-chain oracle that reads Monad block-level data (gas price, base fee).
 *         Anyone can call recordBlock() to snapshot the current block's metrics.
 *         With Monad's ~1 s block time this enables sub-minute prediction markets
 *         like "Will gas spike above X gwei in 100 blocks?"
 *
 *  Feed IDs (deterministic):
 *    GAS_PRICE    = keccak256("GAS_PRICE")
 *    BASE_FEE     = keccak256("BASE_FEE")
 *    BLOCK_NUMBER = keccak256("BLOCK_NUMBER")
 */
contract BlockOracle is IOracle, Ownable {

    struct Snapshot {
        uint256 gasPrice;
        uint256 baseFee;
        uint256 blockNumber;
        uint256 timestamp;
    }

    // Pre-computed feed IDs
    bytes32 public constant GAS_PRICE_FEED    = keccak256("GAS_PRICE");
    bytes32 public constant BASE_FEE_FEED     = keccak256("BASE_FEE");
    bytes32 public constant BLOCK_NUMBER_FEED = keccak256("BLOCK_NUMBER");

    // Latest recorded values
    uint256 public latestGasPrice;
    uint256 public latestBaseFee;
    uint256 public latestBlockNumber;
    uint256 public latestTimestamp;

    // Historical snapshots keyed by block number
    mapping(uint256 => Snapshot) public snapshots;
    uint256 public snapshotCount;

    event BlockRecorded(
        uint256 indexed blockNumber,
        uint256 gasPrice,
        uint256 baseFee,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    // ── Anyone can record ──────────────────────

    /**
     * @notice Snapshot the current block's gas metrics.
     *         Permissionless — can be called by keepers, users, or the resolver.
     */
    function recordBlock() external {
        latestGasPrice   = tx.gasprice;
        latestBaseFee    = block.basefee;
        latestBlockNumber = block.number;
        latestTimestamp   = block.timestamp;

        snapshots[block.number] = Snapshot({
            gasPrice:    tx.gasprice,
            baseFee:     block.basefee,
            blockNumber: block.number,
            timestamp:   block.timestamp
        });
        snapshotCount++;

        emit FeedUpdated(GAS_PRICE_FEED, tx.gasprice, block.timestamp);
        emit FeedUpdated(BASE_FEE_FEED, block.basefee, block.timestamp);
        emit BlockRecorded(block.number, tx.gasprice, block.basefee, block.timestamp);
    }

    // ── IOracle implementation ─────────────────

    function isSupported(bytes32 feedId) external pure override returns (bool) {
        return feedId == GAS_PRICE_FEED
            || feedId == BASE_FEE_FEED
            || feedId == BLOCK_NUMBER_FEED;
    }

    function getLatestValue(bytes32 feedId)
        external view override
        returns (uint256 value, uint256 updatedAt)
    {
        if (feedId == GAS_PRICE_FEED)    return (latestGasPrice, latestTimestamp);
        if (feedId == BASE_FEE_FEED)     return (latestBaseFee, latestTimestamp);
        if (feedId == BLOCK_NUMBER_FEED) return (latestBlockNumber, latestTimestamp);
        revert("Unknown feed");
    }

    // ── Extended: historical lookups ───────────

    /// @notice Get a snapshot at a specific block number
    function getSnapshotAt(uint256 blockNum)
        external view returns (uint256 gasPrice, uint256 baseFee, uint256 ts)
    {
        Snapshot storage s = snapshots[blockNum];
        require(s.timestamp > 0, "No snapshot at this block");
        return (s.gasPrice, s.baseFee, s.timestamp);
    }

    /// @notice Convenience: current gas price (live, no recording needed)
    function currentGasPrice() external view returns (uint256) {
        return tx.gasprice;
    }

    /// @notice Convenience: current base fee (live)
    function currentBaseFee() external view returns (uint256) {
        return block.basefee;
    }
}
