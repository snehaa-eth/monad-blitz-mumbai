// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShareToken
 * @notice ERC-1155 token representing YES/NO shares in prediction markets
 * @dev Each market has 2 token IDs: YES (marketId * 2) and NO (marketId * 2 + 1)
 */
contract ShareToken is ERC1155, Ownable {

    // Market ID => YES token ID and NO token ID
    // YES token ID = marketId * 2
    // NO token ID = marketId * 2 + 1

    // Only MarketFactory can mint/burn shares
    address public marketFactory;

    // Events
    event MarketFactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event SharesMinted(address indexed to, uint256 indexed tokenId, uint256 amount);
    event SharesBurned(address indexed from, uint256 indexed tokenId, uint256 amount);

    modifier onlyMarketFactory() {
        require(msg.sender == marketFactory, "Only MarketFactory can call this");
        _;
    }

    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {
        // URI for token metadata (can be updated later)
    }

    /**
     * @notice Set the MarketFactory address (only owner)
     * @param _marketFactory Address of the MarketFactory contract
     */
    function setMarketFactory(address _marketFactory) external onlyOwner {
        require(_marketFactory != address(0), "Invalid address");
        address oldFactory = marketFactory;
        marketFactory = _marketFactory;
        emit MarketFactoryUpdated(oldFactory, _marketFactory);
    }

    /**
     * @notice Mint shares to an address (only MarketFactory)
     * @param to Address to mint shares to
     * @param tokenId Token ID (YES or NO)
     * @param amount Amount of shares to mint
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external onlyMarketFactory {
        _mint(to, tokenId, amount, "");
        emit SharesMinted(to, tokenId, amount);
    }

    /**
     * @notice Burn shares from an address (only MarketFactory)
     * @param from Address to burn shares from
     * @param tokenId Token ID (YES or NO)
     * @param amount Amount of shares to burn
     */
    function burn(
        address from,
        uint256 tokenId,
        uint256 amount
    ) external onlyMarketFactory {
        _burn(from, tokenId, amount);
        emit SharesBurned(from, tokenId, amount);
    }

    /**
     * @notice Get YES token ID for a market
     * @param marketId Market ID
     * @return YES token ID
     */
    function getYesTokenId(uint256 marketId) public pure returns (uint256) {
        return marketId * 2;
    }

    /**
     * @notice Get NO token ID for a market
     * @param marketId Market ID
     * @return NO token ID
     */
    function getNoTokenId(uint256 marketId) public pure returns (uint256) {
        return marketId * 2 + 1;
    }

    /**
     * @notice Get market ID from token ID
     * @param tokenId Token ID (YES or NO)
     * @return Market ID
     */
    function getMarketId(uint256 tokenId) public pure returns (uint256) {
        return tokenId / 2;
    }

    /**
     * @notice Check if token ID is YES share
     * @param tokenId Token ID
     * @return true if YES share, false if NO share
     */
    function isYesShare(uint256 tokenId) public pure returns (bool) {
        return tokenId % 2 == 0;
    }
}
