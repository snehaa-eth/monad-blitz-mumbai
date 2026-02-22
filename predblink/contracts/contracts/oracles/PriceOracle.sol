// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "../interfaces/IOracle.sol";

/**
 * @title PriceOracle
 * @notice Dual-mode price oracle for PredBlink prediction markets.
 *
 *  Mode 1 — Pyth (production):
 *    Relayer fetches VAA from Pyth Hermes API, calls updateFromPyth().
 *    The contract pays Pyth's update fee, reads the price, and caches it.
 *
 *  Mode 2 — Manual relayer (dev / fallback):
 *    Relayer calls submitPrice() directly — no Pyth dependency.
 *
 *  Both modes write to the same `feeds` mapping, so consumers calling
 *  getLatestValue() don't need to know the source.
 *
 *  Feed IDs:  keccak256(abi.encodePacked("BTC/USD")), etc.
 *  Prices are stored in 8-decimal USD (same as Chainlink / Pyth expo=-8).
 */
contract PriceOracle is IOracle, Ownable {

    struct Feed {
        uint256 price;       // 8-decimal USD
        uint256 updatedAt;
        bool    active;
    }

    // ── Core state ──────────────────────────────

    mapping(bytes32 => Feed)    public feeds;
    mapping(address => bool)    public relayers;

    // Human-readable pair → feedId
    mapping(string => bytes32)  public pairToFeedId;
    string[] public registeredPairs;

    // ── Pyth integration ────────────────────────

    IPyth   public pyth;
    uint256 public pythMaxAge = 120; // seconds — max staleness for Pyth reads

    /// @dev Our feedId (keccak256("BTC/USD")) → Pyth's bytes32 price feed ID
    mapping(bytes32 => bytes32) public pythFeedIds;

    // ── Events ──────────────────────────────────

    event RelayerSet(address indexed relayer, bool enabled);
    event FeedRegistered(string pair, bytes32 indexed feedId);
    event PythConfigured(address pythContract, uint256 maxAge);
    event PythFeedMapped(bytes32 indexed feedId, bytes32 pythFeedId);

    constructor() Ownable(msg.sender) {
        relayers[msg.sender] = true;
    }

    // ═══════════════════════════════════════════
    //                   ADMIN
    // ═══════════════════════════════════════════

    function setRelayer(address relayer, bool enabled) external onlyOwner {
        relayers[relayer] = enabled;
        emit RelayerSet(relayer, enabled);
    }

    function registerFeed(string calldata pair) external onlyOwner returns (bytes32 feedId) {
        feedId = keccak256(abi.encodePacked(pair));
        require(!feeds[feedId].active, "Already registered");
        feeds[feedId].active = true;
        pairToFeedId[pair] = feedId;
        registeredPairs.push(pair);
        emit FeedRegistered(pair, feedId);
    }

    /// @notice Set the Pyth contract address and staleness window
    function configurePyth(address _pyth, uint256 _maxAge) external onlyOwner {
        require(_pyth != address(0), "Zero address");
        pyth = IPyth(_pyth);
        pythMaxAge = _maxAge;
        emit PythConfigured(_pyth, _maxAge);
    }

    /// @notice Map an internal feed to a Pyth price feed ID
    /// @param pair  e.g. "BTC/USD"
    /// @param _pythFeedId  Pyth's bytes32 feed ID from their docs
    function mapPythFeed(string calldata pair, bytes32 _pythFeedId) external onlyOwner {
        bytes32 feedId = keccak256(abi.encodePacked(pair));
        require(feeds[feedId].active, "Feed not registered");
        pythFeedIds[feedId] = _pythFeedId;
        emit PythFeedMapped(feedId, _pythFeedId);
    }

    // ═══════════════════════════════════════════
    //        MODE 1: PYTH PULL ORACLE
    // ═══════════════════════════════════════════

    /**
     * @notice Update price from Pyth on-chain oracle.
     *         Relayer passes the VAA bytes fetched from Pyth Hermes API.
     *         Pays the Pyth update fee from msg.value.
     *
     * @param feedId       Our feed ID: keccak256("BTC/USD")
     * @param priceUpdate  VAA bytes from Pyth Hermes
     */
    function updateFromPyth(
        bytes32 feedId,
        bytes[] calldata priceUpdate
    ) external payable {
        require(relayers[msg.sender], "Not relayer");
        require(feeds[feedId].active, "Feed not registered");

        bytes32 pythId = pythFeedIds[feedId];
        require(pythId != bytes32(0), "No Pyth mapping");
        require(address(pyth) != address(0), "Pyth not configured");

        uint256 fee = pyth.getUpdateFee(priceUpdate);
        require(msg.value >= fee, "Insufficient Pyth fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        PythStructs.Price memory p = pyth.getPriceNoOlderThan(pythId, pythMaxAge);

        uint256 price8dec = _pythTo8Dec(p.price, p.expo);

        feeds[feedId].price     = price8dec;
        feeds[feedId].updatedAt = block.timestamp;

        emit FeedUpdated(feedId, price8dec, block.timestamp);

        // Refund excess ETH
        if (msg.value > fee) {
            (bool ok, ) = msg.sender.call{value: msg.value - fee}("");
            require(ok, "Refund failed");
        }
    }

    /**
     * @notice Batch-update multiple feeds from Pyth in a single tx.
     * @param feedIds       Array of our feed IDs
     * @param priceUpdate   Single VAA containing all the price updates
     */
    function batchUpdateFromPyth(
        bytes32[] calldata feedIds,
        bytes[] calldata priceUpdate
    ) external payable {
        require(relayers[msg.sender], "Not relayer");
        require(address(pyth) != address(0), "Pyth not configured");

        uint256 fee = pyth.getUpdateFee(priceUpdate);
        require(msg.value >= fee, "Insufficient Pyth fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        for (uint256 i; i < feedIds.length; ++i) {
            bytes32 fid = feedIds[i];
            require(feeds[fid].active, "Feed not registered");

            bytes32 pythId = pythFeedIds[fid];
            if (pythId == bytes32(0)) continue;

            PythStructs.Price memory p = pyth.getPriceNoOlderThan(pythId, pythMaxAge);
            uint256 price8dec = _pythTo8Dec(p.price, p.expo);

            feeds[fid].price     = price8dec;
            feeds[fid].updatedAt = block.timestamp;

            emit FeedUpdated(fid, price8dec, block.timestamp);
        }

        if (msg.value > fee) {
            (bool ok, ) = msg.sender.call{value: msg.value - fee}("");
            require(ok, "Refund failed");
        }
    }

    // ═══════════════════════════════════════════
    //       MODE 2: MANUAL RELAYER
    // ═══════════════════════════════════════════

    function submitPrice(bytes32 feedId, uint256 price) external {
        require(relayers[msg.sender], "Not relayer");
        require(feeds[feedId].active, "Feed not registered");

        feeds[feedId].price     = price;
        feeds[feedId].updatedAt = block.timestamp;

        emit FeedUpdated(feedId, price, block.timestamp);
    }

    function submitPrices(
        bytes32[] calldata feedIds,
        uint256[] calldata prices
    ) external {
        require(relayers[msg.sender], "Not relayer");
        require(feedIds.length == prices.length, "Length mismatch");

        for (uint256 i; i < feedIds.length; ++i) {
            require(feeds[feedIds[i]].active, "Feed not registered");
            feeds[feedIds[i]].price     = prices[i];
            feeds[feedIds[i]].updatedAt = block.timestamp;
            emit FeedUpdated(feedIds[i], prices[i], block.timestamp);
        }
    }

    // ═══════════════════════════════════════════
    //          IOracle IMPLEMENTATION
    // ═══════════════════════════════════════════

    function isSupported(bytes32 feedId) external view override returns (bool) {
        return feeds[feedId].active;
    }

    function getLatestValue(bytes32 feedId)
        external view override
        returns (uint256 value, uint256 updatedAt)
    {
        Feed storage f = feeds[feedId];
        require(f.active, "Feed not active");
        return (f.price, f.updatedAt);
    }

    // ═══════════════════════════════════════════
    //             VIEW HELPERS
    // ═══════════════════════════════════════════

    function getPairCount() external view returns (uint256) {
        return registeredPairs.length;
    }

    function getPriceByPair(string calldata pair)
        external view returns (uint256 price, uint256 updatedAt)
    {
        bytes32 fid = pairToFeedId[pair];
        require(feeds[fid].active, "Pair not registered");
        return (feeds[fid].price, feeds[fid].updatedAt);
    }

    function isPythConfigured() external view returns (bool) {
        return address(pyth) != address(0);
    }

    function hasPythMapping(bytes32 feedId) external view returns (bool) {
        return pythFeedIds[feedId] != bytes32(0);
    }

    // ═══════════════════════════════════════════
    //              INTERNALS
    // ═══════════════════════════════════════════

    /**
     * @dev Convert Pyth's (int64 price, int32 expo) → uint256 8-decimal USD.
     *      Pyth typically uses expo=-8, which maps directly.
     *      Handles arbitrary exponents for future-proofing.
     */
    function _pythTo8Dec(int64 _price, int32 _expo) internal pure returns (uint256) {
        require(_price > 0, "Negative price");
        uint256 absPrice = uint256(uint64(_price));

        int32 TARGET_EXPO = -8;

        if (_expo == TARGET_EXPO) {
            return absPrice;
        } else if (_expo > TARGET_EXPO) {
            uint256 factor = 10 ** uint32(_expo - TARGET_EXPO);
            return absPrice * factor;
        } else {
            uint256 factor = 10 ** uint32(TARGET_EXPO - _expo);
            return absPrice / factor;
        }
    }

    receive() external payable {}
}
