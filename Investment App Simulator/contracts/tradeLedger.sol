// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TradeLedger {
    struct Trade {
        uint tradeId;
        address user;
        string symbol;
        string tradeType;
        uint quantity;
        uint price;
        uint timestamp;
    }

    Trade[] public trades;
    event TradeRecorded(uint tradeId, address user, string symbol, string tradeType, uint quantity, uint price);

    function recordTrade(string memory symbol, string memory tradeType, uint quantity, uint price) public {
        trades.push(Trade(trades.length, msg.sender, symbol, tradeType, quantity, price, block.timestamp));
        emit TradeRecorded(trades.length - 1, msg.sender, symbol, tradeType, quantity, price);
    }

    function getAllTrades() public view returns (Trade[] memory) {
        return trades;
    }
}
