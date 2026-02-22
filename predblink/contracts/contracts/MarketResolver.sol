// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOracle.sol";

/**
 * @title IPredBlink (minimal interface for the resolver)
 */
interface IPredBlink {
    enum MarketType   { PRICE, TWITTER, BLOCK_DATA }
    enum MarketStatus { ACTIVE, RESOLVED_YES, RESOLVED_NO, VOIDED }

    function isExpired(uint256 id) external view returns (bool);
    function resolveMarket(uint256 id, uint256 finalValue) external;
    function marketCount() external view returns (uint256);

    function getMarketCore(uint256 id) external view returns (
        MarketType  marketType,
        bytes32     feedId,
        uint256     targetValue,
        uint256     snapshotValue,
        uint256     endTime,
        uint256     endBlock,
        MarketStatus status,
        uint256     resolvedValue
    );
}

/**
 * @title MarketResolver
 * @notice Permissioned resolver that fetches final values from oracle adapters
 *         and settles expired markets on PredBlink.
 *
 *  Flow:
 *    1. Keeper / anyone calls resolve(marketId)
 *    2. Resolver reads the market's feedId + type from PredBlink
 *    3. Fetches final value from the matching oracle adapter
 *    4. Calls predBlink.resolveMarket(id, finalValue)
 *
 *  For TWITTER markets the value is submitted manually by the owner
 *  (off-chain Twitter API → tx) since there's no on-chain Twitter oracle.
 */
contract MarketResolver is Ownable {

    IPredBlink public predBlink;

    // Oracle adapter per market type
    mapping(IPredBlink.MarketType => address) public oracles;

    // Addresses allowed to trigger resolution
    mapping(address => bool) public keepers;

    event OracleSet(IPredBlink.MarketType indexed mt, address oracle);
    event KeeperSet(address indexed keeper, bool enabled);
    event MarketAutoResolved(uint256 indexed marketId, uint256 finalValue);
    event MarketManualResolved(uint256 indexed marketId, uint256 finalValue);

    modifier onlyKeeper() {
        require(keepers[msg.sender] || msg.sender == owner(), "Not keeper");
        _;
    }

    constructor(address _predBlink) Ownable(msg.sender) {
        predBlink = IPredBlink(_predBlink);
        keepers[msg.sender] = true;
    }

    // ── Admin ──────────────────────────────────

    function setOracle(IPredBlink.MarketType mt, address oracle) external onlyOwner {
        oracles[mt] = oracle;
        emit OracleSet(mt, oracle);
    }

    function setKeeper(address keeper, bool enabled) external onlyOwner {
        keepers[keeper] = enabled;
        emit KeeperSet(keeper, enabled);
    }

    function setPredBlink(address _predBlink) external onlyOwner {
        predBlink = IPredBlink(_predBlink);
    }

    // ── Auto-resolution (PRICE & BLOCK_DATA) ──

    /**
     * @notice Resolve a market by fetching the final value from its oracle.
     *         Works for PRICE and BLOCK_DATA markets.
     *         For TWITTER, use resolveManual() instead.
     */
    function resolve(uint256 marketId) external onlyKeeper {
        (
            IPredBlink.MarketType mt,
            bytes32 feedId,
            ,  // targetValue
            ,  // snapshotValue
            ,  // endTime
            ,  // endBlock
            IPredBlink.MarketStatus status,
               // resolvedValue
        ) = predBlink.getMarketCore(marketId);

        require(status == IPredBlink.MarketStatus.ACTIVE, "Not active");
        require(predBlink.isExpired(marketId), "Not expired");

        address oracle = oracles[mt];
        require(oracle != address(0), "No oracle for this type");

        // Strip the prefix from feedId to get the oracle's native feed key.
        // PredBlink stores: keccak256("PRICE:BTC/USD") or keccak256("BLOCK:GAS_PRICE")
        // Oracle expects:   keccak256("BTC/USD") or keccak256("GAS_PRICE")
        // We pass the PredBlink feedId directly — the oracle should support it,
        // OR the keeper can use resolveWithValue() for custom lookup logic.
        (uint256 finalValue, ) = IOracle(oracle).getLatestValue(feedId);

        predBlink.resolveMarket(marketId, finalValue);

        emit MarketAutoResolved(marketId, finalValue);
    }

    /**
     * @notice Resolve by passing a specific oracle feed key (when PredBlink's
     *         feedId doesn't match the oracle's native key exactly).
     */
    function resolveWithFeed(
        uint256 marketId,
        bytes32 oracleFeedId
    ) external onlyKeeper {
        (
            IPredBlink.MarketType mt,
            ,,,,,
            IPredBlink.MarketStatus status,
        ) = predBlink.getMarketCore(marketId);

        require(status == IPredBlink.MarketStatus.ACTIVE, "Not active");
        require(predBlink.isExpired(marketId), "Not expired");

        address oracle = oracles[mt];
        require(oracle != address(0), "No oracle");

        (uint256 finalValue, ) = IOracle(oracle).getLatestValue(oracleFeedId);
        predBlink.resolveMarket(marketId, finalValue);

        emit MarketAutoResolved(marketId, finalValue);
    }

    // ── Manual resolution (TWITTER / fallback) ─

    /**
     * @notice Manually resolve a market by providing the final value.
     *         Used for TWITTER markets (off-chain API data) or as a
     *         fallback when oracle data is unavailable.
     */
    function resolveManual(uint256 marketId, uint256 finalValue) external onlyKeeper {
        predBlink.resolveMarket(marketId, finalValue);
        emit MarketManualResolved(marketId, finalValue);
    }

    // ── Batch resolution ───────────────────────

    /**
     * @notice Resolve multiple markets in a single tx.
     *         Monad's parallel execution makes batch ops efficient.
     */
    function resolveBatch(
        uint256[] calldata marketIds,
        uint256[] calldata finalValues
    ) external onlyKeeper {
        require(marketIds.length == finalValues.length, "Length mismatch");
        for (uint256 i; i < marketIds.length; ++i) {
            predBlink.resolveMarket(marketIds[i], finalValues[i]);
            emit MarketManualResolved(marketIds[i], finalValues[i]);
        }
    }
}
