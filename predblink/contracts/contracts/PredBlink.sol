// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IOracle.sol";

interface IShareToken {
    function mint(address to, uint256 id, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title PredBlink
 * @notice High-frequency prediction markets on Monad.
 *         Supports three market types:
 *           PRICE      – "Will BTC close above $100k in 5 min?"
 *           TWITTER    – "Will this tweet cross 10k likes in 30 min?"
 *           BLOCK_DATA – "Will gas spike above 50 gwei in 100 blocks?"
 *
 * @dev Uses Constant-Product AMM (x·y = k) for pricing.
 *      ShareToken (ERC-1155) tracks YES / NO positions.
 *      Token IDs:  YES = marketId * 2,  NO = marketId * 2 + 1.
 */
contract PredBlink is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ════════════════════════════════════════════
    //                  ENUMS
    // ════════════════════════════════════════════

    enum MarketType   { PRICE, TWITTER, BLOCK_DATA }
    enum MarketStatus { ACTIVE, RESOLVED_YES, RESOLVED_NO, VOIDED }

    // ════════════════════════════════════════════
    //                 STRUCTS
    // ════════════════════════════════════════════

    struct Market {
        MarketType  marketType;
        bytes32     feedId;          // Oracle lookup key
        string      question;        // Human-readable question
        uint256     targetValue;     // Threshold (price 8-dec, count, wei …)
        uint256     snapshotValue;   // Value at creation (context for UI)
        uint256     startTime;
        uint256     endTime;         // Timestamp expiry
        uint256     endBlock;        // Block-number expiry (0 = not used)
        MarketStatus status;
        uint256     resolvedValue;
        // Constant-Product AMM reserves
        uint256     yesPool;
        uint256     noPool;
        // Analytics
        uint256     totalVolume;
        uint256     tradeCount;
        address     creator;
    }

    /// @dev Optional metadata stored only for TWITTER markets
    struct TweetMeta {
        string  tweetId;
        string  authorHandle;
        string  authorName;
        string  tweetText;
        string  avatarUrl;
        uint8   metric;            // 0 VIEWS  1 LIKES  2 RETWEETS  3 COMMENTS
    }

    /// @dev Optional metadata stored only for PRICE markets
    struct PriceMeta {
        string pair;               // "BTC/USD", "ETH/USD", "MON/USD"
        uint8  decimals;           // Price decimal places (usually 8)
    }

    /// @dev Optional metadata stored only for BLOCK_DATA markets
    struct BlockMeta {
        string  metricName;        // "GAS_PRICE", "BASE_FEE"
        uint256 blockInterval;     // How many blocks until expiry
    }

    // ════════════════════════════════════════════
    //              STATE VARIABLES
    // ════════════════════════════════════════════

    IERC20      public immutable usdc;
    IShareToken public immutable shareToken;
    address     public protocolWallet;

    uint256 public marketCount;

    mapping(uint256 => Market)    public markets;
    mapping(uint256 => TweetMeta) public tweetMeta;
    mapping(uint256 => PriceMeta) public priceMeta;
    mapping(uint256 => BlockMeta) public blockMeta;

    // Oracle adapter per market type
    mapping(MarketType => address) public oracles;

    // Addresses authorised to call resolveMarket()
    mapping(address => bool) public resolvers;

    // Duplicate-prevention for Twitter markets (feedId → used)
    mapping(bytes32 => bool) public feedUsed;

    // ── Constants ──────────────────────────────

    uint256 public constant FEE_BPS          = 100;          // 1 %
    uint256 public constant SEED_LIQUIDITY   = 10 * 1e6;     // 10 USDC (6 decimals)
    uint256 public constant INITIAL_POOL     = 100 * 1e18;   // 100 shares each side (18 decimals)
    uint256 public constant SHARES_DECIMALS  = 1e18;         // Share precision
    uint256 public constant USDC_DECIMALS    = 1e6;          // USDC precision
    uint256 public constant MIN_DURATION     = 30;           // 30 s  (Monad is fast)

    // ════════════════════════════════════════════
    //                  EVENTS
    // ════════════════════════════════════════════

    event MarketCreated(
        uint256 indexed id,
        MarketType indexed marketType,
        bytes32 feedId,
        string  question,
        uint256 targetValue,
        uint256 endTime,
        uint256 endBlock,
        address creator
    );
    event Trade(
        uint256 indexed marketId,
        address indexed trader,
        bool    isYes,
        bool    isBuy,
        uint256 usdcAmount,
        uint256 shares,
        uint256 newYesPrice
    );
    event Resolved(uint256 indexed marketId, MarketStatus outcome, uint256 finalValue);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 payout);
    event Voided(uint256 indexed marketId);

    // ════════════════════════════════════════════
    //                MODIFIERS
    // ════════════════════════════════════════════

    modifier onlyResolver() {
        require(resolvers[msg.sender] || msg.sender == owner(), "Not resolver");
        _;
    }

    modifier active(uint256 id) {
        require(id < marketCount, "No such market");
        require(markets[id].status == MarketStatus.ACTIVE, "Not active");
        require(!_isExpired(id), "Expired");
        _;
    }

    // ════════════════════════════════════════════
    //               CONSTRUCTOR
    // ════════════════════════════════════════════

    constructor(
        address _usdc,
        address _shareToken,
        address _protocolWallet
    ) Ownable(msg.sender) {
        usdc         = IERC20(_usdc);
        shareToken   = IShareToken(_shareToken);
        protocolWallet = _protocolWallet;
    }

    // ════════════════════════════════════════════
    //            MARKET CREATION
    // ════════════════════════════════════════════

    /**
     * @notice Create a PRICE prediction market.
     * @param pair         Trading pair string, e.g. "BTC/USD"
     * @param targetPrice  Target price in 8-decimal format
     * @param duration     Seconds until expiry
     * @param question     Human-readable question for the UI
     */
    function createPriceMarket(
        string calldata pair,
        uint256 targetPrice,
        uint256 duration,
        string calldata question
    ) external nonReentrant returns (uint256 id) {
        require(duration >= MIN_DURATION, "Too short");
        require(targetPrice > 0, "Bad target");

        // Unique per pair+target+timestamp to avoid collisions
        bytes32 feedId = keccak256(abi.encodePacked("PRICE:", pair));

        usdc.safeTransferFrom(msg.sender, address(this), SEED_LIQUIDITY);

        uint256 snap = _tryGetValue(MarketType.PRICE, keccak256(abi.encodePacked(pair)));

        id = _createMarket(
            MarketType.PRICE, feedId, question,
            targetPrice, snap,
            block.timestamp + duration, 0
        );

        priceMeta[id] = PriceMeta({ pair: pair, decimals: 8 });
    }

    /**
     * @notice Create a TWITTER prediction market.
     * @param tweetId       Twitter/X post ID
     * @param metric        0 VIEWS, 1 LIKES, 2 RETWEETS, 3 COMMENTS
     * @param targetValue   Engagement target
     * @param duration      Seconds until expiry
     * @param question      Human-readable question
     * @param authorHandle  Tweet author handle (display data)
     * @param authorName    Tweet author name
     * @param tweetText     Tweet content
     * @param avatarUrl     Author avatar URL
     */
    function createTwitterMarket(
        string calldata tweetId,
        uint8   metric,
        uint256 targetValue,
        uint256 duration,
        string calldata question,
        string calldata authorHandle,
        string calldata authorName,
        string calldata tweetText,
        string calldata avatarUrl
    ) external nonReentrant returns (uint256 id) {
        require(duration >= MIN_DURATION, "Too short");
        require(targetValue > 0, "Bad target");
        require(metric <= 3, "Bad metric");

        bytes32 feedId = keccak256(abi.encodePacked("TWEET:", tweetId, ":", metric));
        require(!feedUsed[feedId], "Duplicate tweet+metric");
        feedUsed[feedId] = true;

        usdc.safeTransferFrom(msg.sender, address(this), SEED_LIQUIDITY);

        id = _createMarket(
            MarketType.TWITTER, feedId, question,
            targetValue, 0,
            block.timestamp + duration, 0
        );

        tweetMeta[id] = TweetMeta({
            tweetId:      tweetId,
            authorHandle: authorHandle,
            authorName:   authorName,
            tweetText:    tweetText,
            avatarUrl:    avatarUrl,
            metric:       metric
        });
    }

    /**
     * @notice Create a BLOCK_DATA prediction market (Monad-native).
     * @param metricName    "GAS_PRICE" or "BASE_FEE"
     * @param targetValue   Target in wei
     * @param blockInterval Number of blocks until resolution
     * @param question      Human-readable question
     */
    function createBlockMarket(
        string calldata metricName,
        uint256 targetValue,
        uint256 blockInterval,
        string calldata question
    ) external nonReentrant returns (uint256 id) {
        require(blockInterval > 0, "Bad interval");
        require(targetValue > 0, "Bad target");

        bytes32 feedId = keccak256(abi.encodePacked("BLOCK:", metricName));

        usdc.safeTransferFrom(msg.sender, address(this), SEED_LIQUIDITY);

        uint256 snap = _tryGetValue(
            MarketType.BLOCK_DATA,
            keccak256(abi.encodePacked(metricName))
        );

        // Block-based expiry + generous timestamp fallback
        id = _createMarket(
            MarketType.BLOCK_DATA, feedId, question,
            targetValue, snap,
            block.timestamp + (blockInterval * 2),
            block.number + blockInterval
        );

        blockMeta[id] = BlockMeta({
            metricName:    metricName,
            blockInterval: blockInterval
        });
    }

    // ── Internal creation helper ───────────────

    function _createMarket(
        MarketType  marketType,
        bytes32     feedId,
        string calldata question,
        uint256     targetValue,
        uint256     snapshotValue,
        uint256     endTime,
        uint256     endBlock
    ) internal returns (uint256 id) {
        id = marketCount++;

        markets[id] = Market({
            marketType:    marketType,
            feedId:        feedId,
            question:      question,
            targetValue:   targetValue,
            snapshotValue: snapshotValue,
            startTime:     block.timestamp,
            endTime:       endTime,
            endBlock:      endBlock,
            status:        MarketStatus.ACTIVE,
            resolvedValue: 0,
            yesPool:       INITIAL_POOL,
            noPool:        INITIAL_POOL,
            totalVolume:   0,
            tradeCount:    0,
            creator:       msg.sender
        });

        emit MarketCreated(
            id, marketType, feedId, question,
            targetValue, endTime, endBlock, msg.sender
        );
    }

    function _tryGetValue(MarketType mt, bytes32 oracleFeedId) internal view returns (uint256) {
        address oracle = oracles[mt];
        if (oracle == address(0)) return 0;
        try IOracle(oracle).getLatestValue(oracleFeedId) returns (uint256 v, uint256) {
            return v;
        } catch {
            return 0;
        }
    }

    // ════════════════════════════════════════════
    //        TRADING  (Constant-Product AMM)
    // ════════════════════════════════════════════

    function buyYes(uint256 id, uint256 usdcAmount)
        external nonReentrant active(id)
    {
        _buy(id, usdcAmount, true);
    }

    function buyNo(uint256 id, uint256 usdcAmount)
        external nonReentrant active(id)
    {
        _buy(id, usdcAmount, false);
    }

    function sellYes(uint256 id, uint256 shares)
        external nonReentrant active(id)
    {
        _sell(id, shares, true);
    }

    function sellNo(uint256 id, uint256 shares)
        external nonReentrant active(id)
    {
        _sell(id, shares, false);
    }

    /**
     * @dev Buy shares via CPMM.
     *      Buying YES: USDC (6-dec) is normalized to share-precision (18-dec),
     *      added to the NO pool; YES shares leave the YES pool.
     *      k = yesPool * noPool  (invariant, both in 18-dec)
     *
     *      Matches MarketFactory V1 decimal handling.
     */
    function _buy(uint256 id, uint256 usdcAmount, bool isYes) internal {
        require(usdcAmount > 0, "Zero amount");
        Market storage m = markets[id];

        uint256 fee = (usdcAmount * FEE_BPS) / 10_000;
        uint256 amountAfterFee = usdcAmount - fee;

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        if (fee > 0) usdc.safeTransfer(protocolWallet, fee);

        // Normalize USDC (6-dec) → share precision (18-dec)
        uint256 amountNormalized = (amountAfterFee * SHARES_DECIMALS) / USDC_DECIMALS;

        uint256 k = m.yesPool * m.noPool;
        uint256 shares;

        if (isYes) {
            uint256 newNoPool = m.noPool + amountNormalized;
            uint256 newYesPool = k / newNoPool;
            shares    = m.yesPool - newYesPool;
            m.yesPool = newYesPool;
            m.noPool  = newNoPool;
        } else {
            uint256 newYesPool = m.yesPool + amountNormalized;
            uint256 newNoPool  = k / newYesPool;
            shares   = m.noPool - newNoPool;
            m.noPool = newNoPool;
            m.yesPool = newYesPool;
        }
        require(shares > 0, "Slippage: zero shares");

        uint256 tokenId = isYes ? _yesId(id) : _noId(id);
        shareToken.mint(msg.sender, tokenId, shares);

        m.totalVolume += usdcAmount;
        m.tradeCount++;

        emit Trade(id, msg.sender, isYes, true, usdcAmount, shares, getYesPrice(id));
    }

    /**
     * @dev Sell shares back to the CPMM.
     *      Selling YES: return YES shares (18-dec) to the pool,
     *      receive collateral from the opposite pool, converted back to USDC (6-dec).
     *
     *      Matches MarketFactory V1 decimal handling.
     */
    function _sell(uint256 id, uint256 shares, bool isYes) internal {
        require(shares > 0, "Zero shares");
        Market storage m = markets[id];

        uint256 tokenId = isYes ? _yesId(id) : _noId(id);
        require(shareToken.balanceOf(msg.sender, tokenId) >= shares, "Insufficient shares");

        uint256 k = m.yesPool * m.noPool;
        uint256 sharesOut;  // opposite-side shares displaced (18-dec)

        if (isYes) {
            uint256 newYesPool = m.yesPool + shares;
            uint256 newNoPool  = k / newYesPool;
            sharesOut = m.noPool - newNoPool;
            m.yesPool = newYesPool;
            m.noPool  = newNoPool;
        } else {
            uint256 newNoPool  = m.noPool + shares;
            uint256 newYesPool = k / newNoPool;
            sharesOut = m.yesPool - newYesPool;
            m.noPool  = newNoPool;
            m.yesPool = newYesPool;
        }

        // Convert displaced shares (18-dec) → USDC (6-dec)
        uint256 usdcOut = (sharesOut * USDC_DECIMALS) / SHARES_DECIMALS;

        uint256 fee = (usdcOut * FEE_BPS) / 10_000;
        uint256 netOut = usdcOut - fee;
        require(netOut > 0, "Insufficient output");

        shareToken.burn(msg.sender, tokenId, shares);
        usdc.safeTransfer(msg.sender, netOut);
        if (fee > 0) usdc.safeTransfer(protocolWallet, fee);

        emit Trade(id, msg.sender, isYes, false, netOut, shares, getYesPrice(id));
    }

    // ════════════════════════════════════════════
    //               RESOLUTION
    // ════════════════════════════════════════════

    /**
     * @notice Permissionless resolution for PRICE markets.
     *         Reads the cached Pyth price from PriceOracle — no trusted resolver needed.
     *         Call after market expiry; anyone can trigger it.
     */
    function resolveMarket(uint256 id) external {
        require(id < marketCount, "No such market");
        Market storage m = markets[id];
        require(m.status == MarketStatus.ACTIVE, "Already settled");
        require(_isExpired(id), "Not expired");
        require(m.marketType == MarketType.PRICE, "Use resolveManual for non-price markets");

        address oracle = oracles[m.marketType];
        require(oracle != address(0), "Price oracle not set");

        // PriceOracle feed key is keccak256(pair), e.g. keccak256("BTC/USD")
        bytes32 oracleFeedId = keccak256(abi.encodePacked(priceMeta[id].pair));
        (uint256 finalValue, ) = IOracle(oracle).getLatestValue(oracleFeedId);

        m.resolvedValue = finalValue;
        m.status = finalValue >= m.targetValue
            ? MarketStatus.RESOLVED_YES
            : MarketStatus.RESOLVED_NO;

        emit Resolved(id, m.status, finalValue);
    }

    /**
     * @notice Owner-only manual resolution for TWITTER and BLOCK_DATA markets.
     *         Pass in the observed final metric value (e.g. like count, gas price).
     */
    function resolveManual(uint256 id, uint256 finalValue) external onlyOwner {
        require(id < marketCount, "No such market");
        Market storage m = markets[id];
        require(m.status == MarketStatus.ACTIVE, "Already settled");
        require(_isExpired(id), "Not expired");
        require(m.marketType != MarketType.PRICE, "Use resolveMarket() for price markets");

        m.resolvedValue = finalValue;
        m.status = finalValue >= m.targetValue
            ? MarketStatus.RESOLVED_YES
            : MarketStatus.RESOLVED_NO;

        emit Resolved(id, m.status, finalValue);
    }

    /// @notice Owner can void a market (bad data, deleted tweet, etc.)
    function voidMarket(uint256 id) external onlyOwner {
        require(id < marketCount, "No such market");
        Market storage m = markets[id];
        require(m.status == MarketStatus.ACTIVE, "Already settled");
        m.status = MarketStatus.VOIDED;
        emit Voided(id);
    }

    /// @notice Claim winnings for a resolved market.
    ///         Each winning share (18-dec) redeems for $1 USDC (6-dec).
    function claimWinnings(uint256 id) external nonReentrant {
        require(id < marketCount, "No such market");
        Market storage m = markets[id];
        require(
            m.status == MarketStatus.RESOLVED_YES || m.status == MarketStatus.RESOLVED_NO,
            "Not resolved"
        );

        uint256 winId = m.status == MarketStatus.RESOLVED_YES ? _yesId(id) : _noId(id);
        uint256 shares = shareToken.balanceOf(msg.sender, winId);
        require(shares > 0, "No winning shares");

        // 1 share (1e18) = $1 USDC (1e6)
        uint256 payout = (shares * USDC_DECIMALS) / SHARES_DECIMALS;

        shareToken.burn(msg.sender, winId, shares);
        usdc.safeTransfer(msg.sender, payout);

        emit Claimed(id, msg.sender, payout);
    }

    /// @notice Reclaim shares from a voided market at $0.50 per share
    function reclaimVoided(uint256 id) external nonReentrant {
        require(id < marketCount, "No such market");
        require(markets[id].status == MarketStatus.VOIDED, "Not voided");

        uint256 yBal = shareToken.balanceOf(msg.sender, _yesId(id));
        uint256 nBal = shareToken.balanceOf(msg.sender, _noId(id));
        uint256 total = yBal + nBal;
        require(total > 0, "No shares");

        if (yBal > 0) shareToken.burn(msg.sender, _yesId(id), yBal);
        if (nBal > 0) shareToken.burn(msg.sender, _noId(id), nBal);

        // $0.50 per share: divide by 2 after converting to USDC
        uint256 payout = (total * USDC_DECIMALS) / (2 * SHARES_DECIMALS);
        usdc.safeTransfer(msg.sender, payout);

        emit Claimed(id, msg.sender, payout);
    }

    // ════════════════════════════════════════════
    //              VIEW FUNCTIONS
    // ════════════════════════════════════════════

    function _isExpired(uint256 id) internal view returns (bool) {
        Market storage m = markets[id];
        if (m.endBlock > 0 && block.number >= m.endBlock) return true;
        return block.timestamp >= m.endTime;
    }

    function isExpired(uint256 id) external view returns (bool) {
        return _isExpired(id);
    }

    /// @notice YES price as 18-decimal fraction (0 → 1e18 = 0% → 100%).
    ///         Higher noPool → more demand for YES → higher YES price.
    function getYesPrice(uint256 id) public view returns (uint256) {
        Market storage m = markets[id];
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return 5e17; // 50 %
        return (m.noPool * 1e18) / total;
    }

    /// @notice NO price as 18-decimal fraction
    function getNoPrice(uint256 id) public view returns (uint256) {
        Market storage m = markets[id];
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return 5e17;
        return (m.yesPool * 1e18) / total;
    }

    /// @notice YES price 0-100 (cents) for UI convenience
    function getYesPriceCents(uint256 id) public view returns (uint256) {
        return getYesPrice(id) / 1e16;
    }

    /// @notice NO price 0-100 (cents) for UI convenience
    function getNoPriceCents(uint256 id) public view returns (uint256) {
        return getNoPrice(id) / 1e16;
    }

    function getMarketCore(uint256 id) external view returns (
        MarketType  marketType,
        bytes32     feedId,
        uint256     targetValue,
        uint256     snapshotValue,
        uint256     endTime,
        uint256     endBlock,
        MarketStatus status,
        uint256     resolvedValue
    ) {
        Market storage m = markets[id];
        return (m.marketType, m.feedId, m.targetValue, m.snapshotValue,
                m.endTime, m.endBlock, m.status, m.resolvedValue);
    }

    function getMarketAMM(uint256 id) external view returns (
        uint256 yesPool,
        uint256 noPool,
        uint256 yesPriceCents,
        uint256 noPriceCents,
        uint256 totalVolume,
        uint256 tradeCount
    ) {
        Market storage m = markets[id];
        return (m.yesPool, m.noPool,
                getYesPriceCents(id), getNoPriceCents(id),
                m.totalVolume, m.tradeCount);
    }

    function getMarketQuestion(uint256 id) external view returns (string memory) {
        return markets[id].question;
    }

    function getUserPosition(uint256 id, address user)
        external view returns (uint256 yesShares, uint256 noShares)
    {
        return (
            shareToken.balanceOf(user, _yesId(id)),
            shareToken.balanceOf(user, _noId(id))
        );
    }

    /// @notice Estimate YES shares (18-dec) received for a given USDC amount (6-dec)
    function estimateBuyYes(uint256 id, uint256 usdcAmount) external view returns (uint256) {
        Market storage m = markets[id];
        uint256 net = usdcAmount - (usdcAmount * FEE_BPS) / 10_000;
        uint256 amountNormalized = (net * SHARES_DECIMALS) / USDC_DECIMALS;
        uint256 k = m.yesPool * m.noPool;
        return m.yesPool - (k / (m.noPool + amountNormalized));
    }

    /// @notice Estimate NO shares (18-dec) received for a given USDC amount (6-dec)
    function estimateBuyNo(uint256 id, uint256 usdcAmount) external view returns (uint256) {
        Market storage m = markets[id];
        uint256 net = usdcAmount - (usdcAmount * FEE_BPS) / 10_000;
        uint256 amountNormalized = (net * SHARES_DECIMALS) / USDC_DECIMALS;
        uint256 k = m.yesPool * m.noPool;
        return m.noPool - (k / (m.yesPool + amountNormalized));
    }

    // ── Token-ID helpers ───────────────────────

    function _yesId(uint256 marketId) internal pure returns (uint256) {
        return marketId * 2;
    }
    function _noId(uint256 marketId) internal pure returns (uint256) {
        return marketId * 2 + 1;
    }

    // ════════════════════════════════════════════
    //                  ADMIN
    // ════════════════════════════════════════════

    function setOracle(MarketType mt, address oracle) external onlyOwner {
        oracles[mt] = oracle;
    }

    function setResolver(address addr, bool enabled) external onlyOwner {
        resolvers[addr] = enabled;
    }

    function setProtocolWallet(address w) external onlyOwner {
        protocolWallet = w;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
