
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OptionsLedger {
    enum TradeType { BUY, SELL, SETTLE }
    enum OrderType { MARKET, LIMIT, EXPIRED, SETTLE }

    struct OptionTrade {
        uint tradeId;
        address user;
        uint contractId;
        TradeType tradeType;
        OrderType orderType;
        uint quantity;
        uint price;          // premium per contract
        int totalPnL;        // can be negative
        uint totalAmount;    // total cost/payout
        uint timestamp;
        bool isSettled;
    }

    OptionTrade[] public trades;
    uint private tradeCounter;

    event OptionTradeRecorded(
        uint indexed tradeId,
        address user,
        uint contractId,
        TradeType tradeType,
        OrderType orderType,
        uint quantity,
        uint price,
        int totalPnL,
        uint totalAmount,
        bool isSettled
    );

    // ✅ Record a new option trade (string-based enums + totalAmount)
    function recordOptionTrade(
        uint contractId,
        string memory tradeTypeStr,
        string memory orderTypeStr,
        uint quantity,
        uint price,
        uint totalAmount
    ) public {
        require(quantity > 0, "Quantity > 0 required");
        require(price > 0, "Price > 0 required");

        // Convert string to TradeType enum
        TradeType tradeType;
        if (keccak256(bytes(tradeTypeStr)) == keccak256(bytes("BUY"))) {
            tradeType = TradeType.BUY;
        } else if (keccak256(bytes(tradeTypeStr)) == keccak256(bytes("SELL"))) {
            tradeType = TradeType.SELL;
        } else if (keccak256(bytes(tradeTypeStr)) == keccak256(bytes("SETTLE"))) {
            tradeType = TradeType.SETTLE;
        } else {
            revert("Invalid tradeType");
        }

        // Convert string to OrderType enum
        OrderType orderType;
        if (keccak256(bytes(orderTypeStr)) == keccak256(bytes("MARKET"))) {
            orderType = OrderType.MARKET;
        } else if (keccak256(bytes(orderTypeStr)) == keccak256(bytes("LIMIT"))) {
            orderType = OrderType.LIMIT;
        } else if (keccak256(bytes(orderTypeStr)) == keccak256(bytes("EXPIRED"))) {
            orderType = OrderType.EXPIRED;
        } else if (keccak256(bytes(orderTypeStr)) == keccak256(bytes("SETTLE"))) {
            orderType = OrderType.SETTLE;
        } else {
            revert("Invalid orderType");
        }

        trades.push(OptionTrade({
            tradeId: tradeCounter,
            user: msg.sender,
            contractId: contractId,
            tradeType: tradeType,
            orderType: orderType,
            quantity: quantity,
            price: price,
            totalPnL: 0,
            totalAmount: totalAmount,
            timestamp: block.timestamp,
            isSettled: false
        }));

        emit OptionTradeRecorded(
            tradeCounter,
            msg.sender,
            contractId,
            tradeType,
            orderType,
            quantity,
            price,
            0,
            totalAmount,
            false
        );

        tradeCounter++;
    }

    // ✅ Settle an option trade (matches JS call)
    function settleOptionTrade(
        uint contractId,
        string memory tradeTypeStr,
        uint quantity,
        uint strikePrice,
        uint finalPrice,
        int pnl
    ) public {
        // Find the first matching trade (contractId + tradeType + quantity + not settled)
        uint idx = type(uint).max;
        TradeType tradeType;
        if (keccak256(bytes(tradeTypeStr)) == keccak256(bytes("BUY"))) tradeType = TradeType.BUY;
        else if (keccak256(bytes(tradeTypeStr)) == keccak256(bytes("SELL"))) tradeType = TradeType.SELL;
        else revert("Invalid tradeType");

        for (uint i = 0; i < trades.length; i++) {
            if (
                trades[i].contractId == contractId &&
                trades[i].tradeType == tradeType &&
                trades[i].quantity == quantity &&
                !trades[i].isSettled
            ) {
                idx = i;
                break;
            }
        }

        require(idx != type(uint).max, "Trade not found");

        OptionTrade storage t = trades[idx];
        t.totalPnL = pnl;
        t.orderType = OrderType.SETTLE;
        t.isSettled = true;

        emit OptionTradeRecorded(
            t.tradeId,
            t.user,
            t.contractId,
            TradeType.SETTLE,
            OrderType.SETTLE,
            t.quantity,
            t.price,
            pnl,
            t.totalAmount,
            true
        );
    }

    function getAllOptionTrades() public view returns (OptionTrade[] memory) {
        return trades;
    }
}
