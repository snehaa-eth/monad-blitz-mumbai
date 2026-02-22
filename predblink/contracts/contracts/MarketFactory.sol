// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ShareToken.sol";

/**
 * @title MarketFactory (with AMM)
 * @notice Creates and manages prediction markets for Twitter engagement
 * @dev Uses Constant Product AMM for pricing (like Uniswap)
 */
contract MarketFactory is Ownable, ReentrancyGuard {

    // Enums
    enum MetricType { VIEWS, LIKES, RETWEETS, COMMENTS }
    enum ResolutionStatus { PENDING, RESOLVED_YES, RESOLVED_NO, RESOLVED_INVALID }

    // Structs
    struct Market {
        uint256 id;
        string tweetUrl;
        string tweetId;
        string authorHandle;
        address scout;              // Market creator
        MetricType metric;
        uint256 currentValue;       // Snapshot at creation
        uint256 targetValue;        // Target to hit
        uint256 startTime;
        uint256 endTime;            // startTime + 24 hours
        ResolutionStatus status;
        uint256 yesTokenId;
        uint256 noTokenId;
    }

    // State variables
    ShareToken public shareToken;
    IERC20 public collateralToken;  // USDC (6 decimals)

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;

    // AMM Reserves: Each market has its own liquidity pool
    mapping(uint256 => uint256) public yesReserves;  // YES shares in AMM pool
    mapping(uint256 => uint256) public noReserves;   // NO shares in AMM pool

    // Market uniqueness: hash(tweetId, metric) => marketId
    mapping(bytes32 => uint256) public marketByHash;
    mapping(bytes32 => bool) public marketExists;

    // Constants
    uint256 public constant INITIAL_LIQUIDITY = 10 * 10**6;     // 10 USDC (6 decimals)
    uint256 public constant INITIAL_SHARES = 100 * 10**18;      // 100 shares each side
    uint256 public constant SHARES_DECIMALS = 10**18;           // Share precision
    uint256 public constant USDC_DECIMALS = 10**6;              // USDC precision
    uint256 public constant MARKET_DURATION = 24 hours;
    uint256 public constant RESOLUTION_DELAY = 1 hours;
    uint256 public constant FEE_BPS = 100;                      // 1% fee (100 basis points)
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        address indexed scout,
        string tweetId,
        MetricType metric,
        uint256 currentValue,
        uint256 targetValue
    );

    event SharesBought(
        uint256 indexed marketId,
        address indexed buyer,
        bool isYes,
        uint256 sharesReceived,
        uint256 usdcPaid,
        uint256 newPrice
    );

    event SharesSold(
        uint256 indexed marketId,
        address indexed seller,
        bool isYes,
        uint256 sharesSold,
        uint256 usdcReceived,
        uint256 newPrice
    );

    event MarketResolved(
        uint256 indexed marketId,
        ResolutionStatus status,
        uint256 finalValue
    );

    event SharesRedeemed(
        uint256 indexed marketId,
        address indexed user,
        uint256 shares,
        uint256 payout
    );

    constructor(
        address _shareToken,
        address _collateralToken
    ) Ownable(msg.sender) {
        shareToken = ShareToken(_shareToken);
        collateralToken = IERC20(_collateralToken);
    }

    // ============ MARKET CREATION ============

    /**
     * @notice Create a new prediction market with AMM liquidity
     * @param tweetUrl Full tweet URL
     * @param tweetId Tweet ID extracted from URL
     * @param authorHandle Twitter handle of tweet author
     * @param metric Type of metric (VIEWS, LIKES, RETWEETS, COMMENTS)
     * @param currentValue Current metric value at creation
     * @param targetValue Target value to hit (set by scout)
     */
    function createMarket(
        string memory tweetUrl,
        string memory tweetId,
        string memory authorHandle,
        MetricType metric,
        uint256 currentValue,
        uint256 targetValue
    ) external nonReentrant returns (uint256 marketId) {
        require(targetValue > currentValue, "Target must be > current");

        // Check market uniqueness: only one market per (tweetId, metric)
        bytes32 marketHash = keccak256(abi.encode(tweetId, metric));
        require(!marketExists[marketHash], "Market already exists for this metric");

        // Transfer initial liquidity from scout
        require(
            collateralToken.transferFrom(msg.sender, address(this), INITIAL_LIQUIDITY),
            "USDC transfer failed"
        );

        // Create market
        marketId = nextMarketId++;

        markets[marketId] = Market({
            id: marketId,
            tweetUrl: tweetUrl,
            tweetId: tweetId,
            authorHandle: authorHandle,
            scout: msg.sender,
            metric: metric,
            currentValue: currentValue,
            targetValue: targetValue,
            startTime: block.timestamp,
            endTime: block.timestamp + MARKET_DURATION,
            status: ResolutionStatus.PENDING,
            yesTokenId: shareToken.getYesTokenId(marketId),
            noTokenId: shareToken.getNoTokenId(marketId)
        });

        // Initialize AMM with equal reserves (50/50 starting price)
        yesReserves[marketId] = INITIAL_SHARES;
        noReserves[marketId] = INITIAL_SHARES;

        // Mark market as existing
        marketExists[marketHash] = true;
        marketByHash[marketHash] = marketId;

        // Mint initial shares to scout as reward (10 YES + 10 NO)
        uint256 scoutShares = 10 * SHARES_DECIMALS;
        shareToken.mint(msg.sender, markets[marketId].yesTokenId, scoutShares);
        shareToken.mint(msg.sender, markets[marketId].noTokenId, scoutShares);

        emit MarketCreated(
            marketId,
            msg.sender,
            tweetId,
            metric,
            currentValue,
            targetValue
        );
    }

    // ============ AMM TRADING ============

    /**
     * @notice Buy YES shares using USDC
     * @param marketId Market to buy from
     * @param usdcAmount Amount of USDC to spend
     * @return sharesOut Amount of YES shares received
     */
    function buyYes(uint256 marketId, uint256 usdcAmount) external nonReentrant returns (uint256 sharesOut) {
        Market storage market = markets[marketId];
        require(market.status == ResolutionStatus.PENDING, "Market not active");
        require(block.timestamp < market.endTime, "Market expired");
        require(usdcAmount > 0, "Amount must be > 0");

        // Transfer USDC from buyer
        require(
            collateralToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );

        // Apply fee
        uint256 fee = (usdcAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = usdcAmount - fee;

        // Calculate shares out using constant product formula
        // When buying YES: we're adding to NO reserve (USDC backs NO side)
        // Formula: sharesOut = yesReserves - (k / (noReserves + amountNormalized))
        uint256 amountNormalized = (amountAfterFee * SHARES_DECIMALS) / USDC_DECIMALS;
        uint256 k = yesReserves[marketId] * noReserves[marketId];
        
        uint256 newNoReserve = noReserves[marketId] + amountNormalized;
        uint256 newYesReserve = k / newNoReserve;
        
        sharesOut = yesReserves[marketId] - newYesReserve;
        require(sharesOut > 0, "Insufficient output");

        // Update reserves
        yesReserves[marketId] = newYesReserve;
        noReserves[marketId] = newNoReserve;

        // Mint YES shares to buyer
        shareToken.mint(msg.sender, market.yesTokenId, sharesOut);

        emit SharesBought(
            marketId,
            msg.sender,
            true,
            sharesOut,
            usdcAmount,
            getYesPrice(marketId)
        );
    }

    /**
     * @notice Buy NO shares using USDC
     * @param marketId Market to buy from
     * @param usdcAmount Amount of USDC to spend
     * @return sharesOut Amount of NO shares received
     */
    function buyNo(uint256 marketId, uint256 usdcAmount) external nonReentrant returns (uint256 sharesOut) {
        Market storage market = markets[marketId];
        require(market.status == ResolutionStatus.PENDING, "Market not active");
        require(block.timestamp < market.endTime, "Market expired");
        require(usdcAmount > 0, "Amount must be > 0");

        // Transfer USDC from buyer
        require(
            collateralToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );

        // Apply fee
        uint256 fee = (usdcAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = usdcAmount - fee;

        // Calculate shares out using constant product formula
        // When buying NO: we're adding to YES reserve
        uint256 amountNormalized = (amountAfterFee * SHARES_DECIMALS) / USDC_DECIMALS;
        uint256 k = yesReserves[marketId] * noReserves[marketId];
        
        uint256 newYesReserve = yesReserves[marketId] + amountNormalized;
        uint256 newNoReserve = k / newYesReserve;
        
        sharesOut = noReserves[marketId] - newNoReserve;
        require(sharesOut > 0, "Insufficient output");

        // Update reserves
        yesReserves[marketId] = newYesReserve;
        noReserves[marketId] = newNoReserve;

        // Mint NO shares to buyer
        shareToken.mint(msg.sender, market.noTokenId, sharesOut);

        emit SharesSold(
            marketId,
            msg.sender,
            false,
            sharesOut,
            usdcAmount,
            getNoPrice(marketId)
        );
    }

    /**
     * @notice Sell YES shares for USDC
     * @param marketId Market to sell to
     * @param shares Amount of YES shares to sell
     * @return usdcOut Amount of USDC received
     */
    function sellYes(uint256 marketId, uint256 shares) external nonReentrant returns (uint256 usdcOut) {
        Market storage market = markets[marketId];
        require(market.status == ResolutionStatus.PENDING, "Market not active");
        require(shares > 0, "Amount must be > 0");

        // Check user has enough shares
        require(
            shareToken.balanceOf(msg.sender, market.yesTokenId) >= shares,
            "Insufficient YES shares"
        );

        // Calculate USDC out using constant product formula
        // When selling YES: we're adding YES back to reserve, getting NO out (as USDC value)
        uint256 k = yesReserves[marketId] * noReserves[marketId];
        
        uint256 newYesReserve = yesReserves[marketId] + shares;
        uint256 newNoReserve = k / newYesReserve;
        
        uint256 noOut = noReserves[marketId] - newNoReserve;
        usdcOut = (noOut * USDC_DECIMALS) / SHARES_DECIMALS;

        // Apply fee
        uint256 fee = (usdcOut * FEE_BPS) / BPS_DENOMINATOR;
        usdcOut = usdcOut - fee;

        require(usdcOut > 0, "Insufficient output");

        // Update reserves
        yesReserves[marketId] = newYesReserve;
        noReserves[marketId] = newNoReserve;

        // Burn shares from seller
        shareToken.burn(msg.sender, market.yesTokenId, shares);

        // Transfer USDC to seller
        require(collateralToken.transfer(msg.sender, usdcOut), "USDC transfer failed");

        emit SharesSold(
            marketId,
            msg.sender,
            true,
            shares,
            usdcOut,
            getYesPrice(marketId)
        );
    }

    /**
     * @notice Sell NO shares for USDC
     * @param marketId Market to sell to
     * @param shares Amount of NO shares to sell
     * @return usdcOut Amount of USDC received
     */
    function sellNo(uint256 marketId, uint256 shares) external nonReentrant returns (uint256 usdcOut) {
        Market storage market = markets[marketId];
        require(market.status == ResolutionStatus.PENDING, "Market not active");
        require(shares > 0, "Amount must be > 0");

        // Check user has enough shares
        require(
            shareToken.balanceOf(msg.sender, market.noTokenId) >= shares,
            "Insufficient NO shares"
        );

        // Calculate USDC out
        uint256 k = yesReserves[marketId] * noReserves[marketId];
        
        uint256 newNoReserve = noReserves[marketId] + shares;
        uint256 newYesReserve = k / newNoReserve;
        
        uint256 yesOut = yesReserves[marketId] - newYesReserve;
        usdcOut = (yesOut * USDC_DECIMALS) / SHARES_DECIMALS;

        // Apply fee
        uint256 fee = (usdcOut * FEE_BPS) / BPS_DENOMINATOR;
        usdcOut = usdcOut - fee;

        require(usdcOut > 0, "Insufficient output");

        // Update reserves
        yesReserves[marketId] = newYesReserve;
        noReserves[marketId] = newNoReserve;

        // Burn shares from seller
        shareToken.burn(msg.sender, market.noTokenId, shares);

        // Transfer USDC to seller
        require(collateralToken.transfer(msg.sender, usdcOut), "USDC transfer failed");

        emit SharesSold(
            marketId,
            msg.sender,
            false,
            shares,
            usdcOut,
            getNoPrice(marketId)
        );
    }

    // ============ RESOLUTION ============

    /**
     * @notice Resolve a market (owner only)
     * @param marketId Market to resolve
     * @param finalValue Final metric value from oracle
     */
    function resolveMarket(uint256 marketId, uint256 finalValue) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status == ResolutionStatus.PENDING, "Already resolved");
        require(block.timestamp >= market.endTime + RESOLUTION_DELAY, "Too early");

        if (finalValue >= market.targetValue) {
            market.status = ResolutionStatus.RESOLVED_YES;
        } else {
            market.status = ResolutionStatus.RESOLVED_NO;
        }

        emit MarketResolved(marketId, market.status, finalValue);
    }

    /**
     * @notice Resolve market as invalid (tweet deleted, etc.)
     */
    function resolveAsInvalid(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status == ResolutionStatus.PENDING, "Already resolved");

        market.status = ResolutionStatus.RESOLVED_INVALID;

        emit MarketResolved(marketId, ResolutionStatus.RESOLVED_INVALID, 0);
    }

    /**
     * @notice Redeem winning shares for USDC
     * @param marketId Market to redeem from
     * @param shares Number of shares to redeem
     */
    function redeem(uint256 marketId, uint256 shares) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.status != ResolutionStatus.PENDING, "Not resolved");
        require(shares > 0, "Must redeem at least 1 share");

        uint256 payout;
        
        if (market.status == ResolutionStatus.RESOLVED_YES) {
            // YES wins - redeem YES shares for $1 each
            require(
                shareToken.balanceOf(msg.sender, market.yesTokenId) >= shares,
                "Insufficient YES shares"
            );
            shareToken.burn(msg.sender, market.yesTokenId, shares);
            payout = (shares * USDC_DECIMALS) / SHARES_DECIMALS;  // $1 per share
            
        } else if (market.status == ResolutionStatus.RESOLVED_NO) {
            // NO wins - redeem NO shares for $1 each
            require(
                shareToken.balanceOf(msg.sender, market.noTokenId) >= shares,
                "Insufficient NO shares"
            );
            shareToken.burn(msg.sender, market.noTokenId, shares);
            payout = (shares * USDC_DECIMALS) / SHARES_DECIMALS;  // $1 per share
            
        } else if (market.status == ResolutionStatus.RESOLVED_INVALID) {
            // Invalid - both YES and NO redeem for $0.50 each
            uint256 yesBalance = shareToken.balanceOf(msg.sender, market.yesTokenId);
            uint256 noBalance = shareToken.balanceOf(msg.sender, market.noTokenId);
            
            if (yesBalance >= shares) {
                shareToken.burn(msg.sender, market.yesTokenId, shares);
            } else if (noBalance >= shares) {
                shareToken.burn(msg.sender, market.noTokenId, shares);
            } else {
                revert("Insufficient shares");
            }
            
            payout = (shares * USDC_DECIMALS) / (2 * SHARES_DECIMALS);  // $0.50 per share
        }

        require(collateralToken.transfer(msg.sender, payout), "Payout failed");

        emit SharesRedeemed(marketId, msg.sender, shares, payout);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get current YES price (0-1e18 representing 0-100%)
     */
    function getYesPrice(uint256 marketId) public view returns (uint256) {
        uint256 yes = yesReserves[marketId];
        uint256 no = noReserves[marketId];
        if (yes + no == 0) return 5e17; // 50% default
        return (no * 1e18) / (yes + no);
    }

    /**
     * @notice Get current NO price (0-1e18 representing 0-100%)
     */
    function getNoPrice(uint256 marketId) public view returns (uint256) {
        uint256 yes = yesReserves[marketId];
        uint256 no = noReserves[marketId];
        if (yes + no == 0) return 5e17; // 50% default
        return (yes * 1e18) / (yes + no);
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @notice Check if market exists for tweet + metric combo
     */
    function getMarketByTweetAndMetric(
        string memory tweetId, 
        MetricType metric
    ) external view returns (uint256 marketId, bool exists) {
        bytes32 marketHash = keccak256(abi.encode(tweetId, metric));
        exists = marketExists[marketHash];
        marketId = marketByHash[marketHash];
    }

    /**
     * @notice Get total market count
     */
    function getMarketCount() external view returns (uint256) {
        return nextMarketId;
    }

    /**
     * @notice Get AMM reserves for a market
     */
    function getReserves(uint256 marketId) external view returns (uint256 yesRes, uint256 noRes) {
        return (yesReserves[marketId], noReserves[marketId]);
    }

    /**
     * @notice Estimate shares out for a buy order (before executing)
     */
    function estimateBuyYes(uint256 marketId, uint256 usdcAmount) external view returns (uint256 sharesOut) {
        uint256 fee = (usdcAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = usdcAmount - fee;
        uint256 amountNormalized = (amountAfterFee * SHARES_DECIMALS) / USDC_DECIMALS;
        
        uint256 k = yesReserves[marketId] * noReserves[marketId];
        uint256 newNoReserve = noReserves[marketId] + amountNormalized;
        uint256 newYesReserve = k / newNoReserve;
        
        return yesReserves[marketId] - newYesReserve;
    }

    /**
     * @notice Estimate shares out for a NO buy order
     */
    function estimateBuyNo(uint256 marketId, uint256 usdcAmount) external view returns (uint256 sharesOut) {
        uint256 fee = (usdcAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = usdcAmount - fee;
        uint256 amountNormalized = (amountAfterFee * SHARES_DECIMALS) / USDC_DECIMALS;
        
        uint256 k = yesReserves[marketId] * noReserves[marketId];
        uint256 newYesReserve = yesReserves[marketId] + amountNormalized;
        uint256 newNoReserve = k / newYesReserve;
        
        return noReserves[marketId] - newNoReserve;
    }
}
