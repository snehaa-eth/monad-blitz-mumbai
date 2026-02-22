// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ShareToken
 * @notice ERC-1155 style token for market shares (YES/NO positions)
 */
interface IShareToken {
    function mint(address to, uint256 id, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title MarketFactoryV2
 * @notice Creates and manages prediction markets for Twitter/X metrics
 * @dev Stores full tweet data on-chain, prevents duplicates, uses AMM pricing
 */
contract MarketFactoryV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ ENUMS ============

    enum MetricType { VIEWS, LIKES, RETWEETS, COMMENTS }
    enum MarketStatus { ACTIVE, RESOLVED_YES, RESOLVED_NO }

    // ============ STRUCTS ============

    /// @notice Tweet data stored on-chain
    struct TweetData {
        string tweetId;           // Unique tweet identifier
        string tweetUrl;          // Full URL to tweet
        string tweetText;         // Tweet content (max ~280 chars)
        string authorHandle;      // @username
        string authorName;        // Display name
        string avatarUrl;         // Profile picture URL
        string mediaJson;         // JSON array of media [{type, url}]
        // Quote tweet (if any)
        bool hasQuotedTweet;
        string quotedTweetId;
        string quotedTweetText;
        string quotedAuthorHandle;
        string quotedAuthorName;
    }

    /// @notice Full market structure
    struct Market {
        // Tweet Data
        TweetData tweet;
        
        // Market Configuration
        string category;          // CRYPTO, MEMES, CELEB, etc.
        MetricType metric;        // What we're predicting
        uint256 targetValue;      // Target to hit (e.g., 1000000 for 1M)
        uint256 startTime;        // When market was created
        uint256 endTime;          // When market expires (startTime + duration)
        
        // Market State
        MarketStatus status;
        uint256 currentValue;     // Last known metric value
        
        // Token IDs
        uint256 yesTokenId;
        uint256 noTokenId;
        
        // AMM State
        uint256 yesReserve;       // Virtual reserve for YES
        uint256 noReserve;        // Virtual reserve for NO
        
        // Analytics
        uint256 totalVolume;      // Total USDC traded
        uint256 tradeCount;       // Number of trades
        address creator;          // Who created this market
    }

    // ============ STATE VARIABLES ============

    IERC20 public usdc;
    IShareToken public shareToken;
    address public protocolWallet;
    address public oracle;

    uint256 public marketCount;
    uint256 public nextTokenId = 1;
    
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1%
    uint256 public constant INITIAL_LIQUIDITY = 10 * 1e6; // $10 USDC (6 decimals)
    uint256 public constant INITIAL_RESERVE = 100 * 1e6; // Initial AMM reserve
    uint256 public constant DEFAULT_DURATION = 24 hours;

    // Market storage
    mapping(uint256 => Market) public markets;
    
    // Duplicate prevention: keccak256(tweetId + metric) => marketId (0 means no market)
    mapping(bytes32 => uint256) public tweetMetricToMarket;
    
    // Category index for filtering
    mapping(string => uint256[]) public marketsByCategory;

    // ============ EVENTS ============

    event MarketCreated(
        uint256 indexed marketId,
        string tweetId,
        MetricType metric,
        uint256 targetValue,
        string category,
        address creator
    );

    event SharesPurchased(
        uint256 indexed marketId,
        address indexed buyer,
        bool isYes,
        uint256 usdcAmount,
        uint256 sharesReceived,
        uint256 newPrice
    );

    event SharesSold(
        uint256 indexed marketId,
        address indexed seller,
        bool isYes,
        uint256 sharesSold,
        uint256 usdcReceived
    );

    event MarketResolved(
        uint256 indexed marketId,
        MarketStatus outcome,
        uint256 finalValue
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    // ============ CONSTRUCTOR ============

    constructor(
        address _usdc,
        address _shareToken,
        address _protocolWallet,
        address _oracle
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        shareToken = IShareToken(_shareToken);
        protocolWallet = _protocolWallet;
        oracle = _oracle;
    }

    // ============ MODIFIERS ============

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < marketCount, "Market does not exist");
        _;
    }

    modifier marketActive(uint256 marketId) {
        require(markets[marketId].status == MarketStatus.ACTIVE, "Market not active");
        require(block.timestamp < markets[marketId].endTime, "Market expired");
        _;
    }

    // ============ MARKET CREATION ============

    /**
     * @notice Create a new prediction market
     * @param tweetId Unique tweet identifier
     * @param tweetUrl Full URL to the tweet
     * @param tweetText Content of the tweet
     * @param authorHandle Twitter handle (without @)
     * @param authorName Display name
     * @param avatarUrl Profile picture URL
     * @param mediaJson JSON array of media objects
     * @param hasQuotedTweet Whether this tweet quotes another
     * @param quotedTweetId ID of quoted tweet (if any)
     * @param quotedTweetText Text of quoted tweet (if any)
     * @param quotedAuthorHandle Handle of quoted author (if any)
     * @param quotedAuthorName Name of quoted author (if any)
     * @param category Market category (CRYPTO, MEMES, etc.)
     * @param metric Type of metric to predict
     * @param targetValue Target value to hit
     * @param duration Market duration in seconds (default 24 hours)
     */
    function createMarket(
        // Tweet data
        string calldata tweetId,
        string calldata tweetUrl,
        string calldata tweetText,
        string calldata authorHandle,
        string calldata authorName,
        string calldata avatarUrl,
        string calldata mediaJson,
        // Quote tweet data
        bool hasQuotedTweet,
        string calldata quotedTweetId,
        string calldata quotedTweetText,
        string calldata quotedAuthorHandle,
        string calldata quotedAuthorName,
        // Market config
        string calldata category,
        MetricType metric,
        uint256 targetValue,
        uint256 duration
    ) external nonReentrant returns (uint256 marketId) {
        // Validate inputs
        require(bytes(tweetId).length > 0, "Tweet ID required");
        require(targetValue > 0, "Target must be > 0");
        
        // Default duration to 24 hours if not specified
        if (duration == 0) {
            duration = DEFAULT_DURATION;
        }

        // Check for duplicate (same tweet + same metric)
        bytes32 key = keccak256(abi.encodePacked(tweetId, uint8(metric)));
        require(tweetMetricToMarket[key] == 0, "Market already exists for this tweet+metric");

        // Collect initial liquidity
        usdc.safeTransferFrom(msg.sender, address(this), INITIAL_LIQUIDITY);

        // Create market ID
        marketId = marketCount++;

        // Generate token IDs
        uint256 yesTokenId = nextTokenId++;
        uint256 noTokenId = nextTokenId++;

        // Create the market
        Market storage m = markets[marketId];
        
        // Store tweet data
        m.tweet.tweetId = tweetId;
        m.tweet.tweetUrl = tweetUrl;
        m.tweet.tweetText = tweetText;
        m.tweet.authorHandle = authorHandle;
        m.tweet.authorName = authorName;
        m.tweet.avatarUrl = avatarUrl;
        m.tweet.mediaJson = mediaJson;
        m.tweet.hasQuotedTweet = hasQuotedTweet;
        m.tweet.quotedTweetId = quotedTweetId;
        m.tweet.quotedTweetText = quotedTweetText;
        m.tweet.quotedAuthorHandle = quotedAuthorHandle;
        m.tweet.quotedAuthorName = quotedAuthorName;
        
        // Store market config
        m.category = category;
        m.metric = metric;
        m.targetValue = targetValue;
        m.startTime = block.timestamp;
        m.endTime = block.timestamp + duration;
        
        // Initialize state
        m.status = MarketStatus.ACTIVE;
        m.yesTokenId = yesTokenId;
        m.noTokenId = noTokenId;
        m.yesReserve = INITIAL_RESERVE;
        m.noReserve = INITIAL_RESERVE;
        m.creator = msg.sender;

        // Store duplicate prevention mapping
        // We store marketId + 1 so that 0 means "no market"
        tweetMetricToMarket[key] = marketId + 1;

        // Add to category index
        marketsByCategory[category].push(marketId);

        emit MarketCreated(marketId, tweetId, metric, targetValue, category, msg.sender);

        return marketId;
    }

    // ============ TRADING ============

    /**
     * @notice Buy YES shares
     */
    function buyYes(uint256 marketId, uint256 usdcAmount) 
        external 
        nonReentrant 
        marketExists(marketId) 
        marketActive(marketId) 
    {
        _buyShares(marketId, usdcAmount, true);
    }

    /**
     * @notice Buy NO shares
     */
    function buyNo(uint256 marketId, uint256 usdcAmount) 
        external 
        nonReentrant 
        marketExists(marketId) 
        marketActive(marketId) 
    {
        _buyShares(marketId, usdcAmount, false);
    }

    /**
     * @notice Internal function to buy shares
     */
    function _buyShares(uint256 marketId, uint256 usdcAmount, bool isYes) internal {
        require(usdcAmount > 0, "Amount must be > 0");

        Market storage m = markets[marketId];

        // Calculate fee
        uint256 fee = (usdcAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 amountAfterFee = usdcAmount - fee;

        // Transfer USDC
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        
        // Send fee to protocol
        if (fee > 0) {
            usdc.safeTransfer(protocolWallet, fee);
        }

        // Calculate shares using AMM
        uint256 shares;
        if (isYes) {
            shares = _calculateBuyShares(m.yesReserve, m.noReserve, amountAfterFee);
            m.yesReserve += amountAfterFee;
        } else {
            shares = _calculateBuyShares(m.noReserve, m.yesReserve, amountAfterFee);
            m.noReserve += amountAfterFee;
        }

        // Mint shares
        uint256 tokenId = isYes ? m.yesTokenId : m.noTokenId;
        shareToken.mint(msg.sender, tokenId, shares);

        // Update analytics
        m.totalVolume += usdcAmount;
        m.tradeCount++;

        // Get new price
        uint256 newPrice = isYes ? getYesPrice(marketId) : getNoPrice(marketId);

        emit SharesPurchased(marketId, msg.sender, isYes, usdcAmount, shares, newPrice);
    }

    /**
     * @notice Sell YES shares
     */
    function sellYes(uint256 marketId, uint256 shares)
        external
        nonReentrant
        marketExists(marketId)
        marketActive(marketId)
    {
        _sellShares(marketId, shares, true);
    }

    /**
     * @notice Sell NO shares
     */
    function sellNo(uint256 marketId, uint256 shares)
        external
        nonReentrant
        marketExists(marketId)
        marketActive(marketId)
    {
        _sellShares(marketId, shares, false);
    }

    /**
     * @notice Internal function to sell shares
     */
    function _sellShares(uint256 marketId, uint256 shares, bool isYes) internal {
        require(shares > 0, "Shares must be > 0");

        Market storage m = markets[marketId];
        uint256 tokenId = isYes ? m.yesTokenId : m.noTokenId;

        require(shareToken.balanceOf(msg.sender, tokenId) >= shares, "Insufficient shares");

        // Calculate USDC to return
        uint256 usdcAmount;
        if (isYes) {
            usdcAmount = _calculateSellReturn(m.yesReserve, m.noReserve, shares);
            m.yesReserve -= usdcAmount;
        } else {
            usdcAmount = _calculateSellReturn(m.noReserve, m.yesReserve, shares);
            m.noReserve -= usdcAmount;
        }

        // Calculate fee
        uint256 fee = (usdcAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 amountAfterFee = usdcAmount - fee;

        // Burn shares
        shareToken.burn(msg.sender, tokenId, shares);

        // Transfer USDC
        usdc.safeTransfer(msg.sender, amountAfterFee);
        if (fee > 0) {
            usdc.safeTransfer(protocolWallet, fee);
        }

        emit SharesSold(marketId, msg.sender, isYes, shares, amountAfterFee);
    }

    // ============ RESOLUTION ============

    /**
     * @notice Resolve a market (oracle only)
     * @param marketId Market to resolve
     * @param finalValue The final metric value from Twitter
     */
    function resolveMarket(uint256 marketId, uint256 finalValue) 
        external 
        onlyOracle 
        marketExists(marketId) 
    {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.ACTIVE, "Market already resolved");
        require(block.timestamp >= m.endTime, "Market not expired yet");

        m.currentValue = finalValue;

        if (finalValue >= m.targetValue) {
            m.status = MarketStatus.RESOLVED_YES;
        } else {
            m.status = MarketStatus.RESOLVED_NO;
        }

        emit MarketResolved(marketId, m.status, finalValue);
    }

    /**
     * @notice Claim winnings after market resolution
     */
    function claimWinnings(uint256 marketId) 
        external 
        nonReentrant 
        marketExists(marketId) 
    {
        Market storage m = markets[marketId];
        require(m.status != MarketStatus.ACTIVE, "Market not resolved");

        uint256 winningTokenId;
        if (m.status == MarketStatus.RESOLVED_YES) {
            winningTokenId = m.yesTokenId;
        } else {
            winningTokenId = m.noTokenId;
        }

        uint256 shares = shareToken.balanceOf(msg.sender, winningTokenId);
        require(shares > 0, "No winning shares");

        // Each winning share is worth $1
        uint256 payout = shares * 1e6; // 1 USDC per share

        // Burn the shares
        shareToken.burn(msg.sender, winningTokenId, shares);

        // Transfer winnings
        usdc.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ============ AMM MATH ============

    /**
     * @notice Calculate shares received when buying
     */
    function _calculateBuyShares(
        uint256 buyReserve,
        uint256 sellReserve,
        uint256 usdcIn
    ) internal pure returns (uint256) {
        // Simple formula: shares = (usdcIn * sellReserve) / (buyReserve + sellReserve)
        return (usdcIn * sellReserve) / (buyReserve + sellReserve);
    }

    /**
     * @notice Calculate USDC received when selling
     */
    function _calculateSellReturn(
        uint256 sellReserve,
        uint256 buyReserve,
        uint256 shares
    ) internal pure returns (uint256) {
        // Simple formula: usdc = (shares * sellReserve) / (sellReserve + buyReserve + shares)
        return (shares * sellReserve) / (sellReserve + buyReserve + shares);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get YES price (0-100 representing cents)
     */
    function getYesPrice(uint256 marketId) public view returns (uint256) {
        Market storage m = markets[marketId];
        if (m.yesReserve + m.noReserve == 0) return 50;
        return (m.yesReserve * 100) / (m.yesReserve + m.noReserve);
    }

    /**
     * @notice Get NO price (0-100 representing cents)
     */
    function getNoPrice(uint256 marketId) public view returns (uint256) {
        Market storage m = markets[marketId];
        if (m.yesReserve + m.noReserve == 0) return 50;
        return (m.noReserve * 100) / (m.yesReserve + m.noReserve);
    }

    /**
     * @notice Get reserves for a market
     */
    function getReserves(uint256 marketId) external view returns (uint256 yesRes, uint256 noRes) {
        Market storage m = markets[marketId];
        return (m.yesReserve, m.noReserve);
    }

    /**
     * @notice Get full market data
     */
    function getMarket(uint256 marketId) external view returns (
        string memory tweetId,
        string memory tweetUrl,
        string memory tweetText,
        string memory authorHandle,
        string memory authorName,
        string memory avatarUrl,
        string memory mediaJson,
        string memory category,
        MetricType metric,
        uint256 targetValue,
        uint256 startTime,
        uint256 endTime,
        MarketStatus status,
        uint256 yesPrice,
        uint256 noPrice,
        uint256 totalVolume
    ) {
        Market storage m = markets[marketId];
        return (
            m.tweet.tweetId,
            m.tweet.tweetUrl,
            m.tweet.tweetText,
            m.tweet.authorHandle,
            m.tweet.authorName,
            m.tweet.avatarUrl,
            m.tweet.mediaJson,
            m.category,
            m.metric,
            m.targetValue,
            m.startTime,
            m.endTime,
            m.status,
            getYesPrice(marketId),
            getNoPrice(marketId),
            m.totalVolume
        );
    }

    /**
     * @notice Get quoted tweet data for a market
     */
    function getQuotedTweet(uint256 marketId) external view returns (
        bool hasQuote,
        string memory quotedId,
        string memory quotedText,
        string memory quotedHandle,
        string memory quotedName
    ) {
        Market storage m = markets[marketId];
        return (
            m.tweet.hasQuotedTweet,
            m.tweet.quotedTweetId,
            m.tweet.quotedTweetText,
            m.tweet.quotedAuthorHandle,
            m.tweet.quotedAuthorName
        );
    }

    /**
     * @notice Check if a market exists for a tweet+metric combination
     */
    function marketExistsFor(string calldata tweetId, MetricType metric) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(tweetId, uint8(metric)));
        return tweetMetricToMarket[key] != 0;
    }

    /**
     * @notice Get market ID for a tweet+metric combination (returns 0 if none)
     */
    function getMarketFor(string calldata tweetId, MetricType metric) external view returns (uint256) {
        bytes32 key = keccak256(abi.encodePacked(tweetId, uint8(metric)));
        uint256 stored = tweetMetricToMarket[key];
        if (stored == 0) return 0;
        return stored - 1; // We stored marketId + 1
    }

    /**
     * @notice Get all market IDs for a category
     */
    function getMarketsByCategory(string calldata category) external view returns (uint256[] memory) {
        return marketsByCategory[category];
    }

    /**
     * @notice Get user's position in a market
     */
    function getUserPosition(uint256 marketId, address user) external view returns (uint256 yesShares, uint256 noShares) {
        Market storage m = markets[marketId];
        return (
            shareToken.balanceOf(user, m.yesTokenId),
            shareToken.balanceOf(user, m.noTokenId)
        );
    }

    /**
     * @notice Get token IDs for a market
     */
    function getTokenIds(uint256 marketId) external view returns (uint256 yesTokenId, uint256 noTokenId) {
        Market storage m = markets[marketId];
        return (m.yesTokenId, m.noTokenId);
    }

    // ============ ADMIN FUNCTIONS ============

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setProtocolWallet(address _wallet) external onlyOwner {
        protocolWallet = _wallet;
    }

    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
