
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TradeLedger {
    enum TradeType { BUY, SELL }

    struct Trade {
        uint tradeId;
        address user;
        bytes32 symbol;   // changed from string -> bytes32
        TradeType tradeType;
        uint quantity;
        uint price;
        uint timestamp;
    }

    Trade[] public trades;
    uint private tradeCounter;

    // ✅ Indexed tradeId for efficient filtering
    event TradeRecorded(
        uint indexed tradeId,
        address user,
        bytes32 symbol,
        TradeType tradeType,
        uint quantity,
        uint price
    );

    // Helper: convert string to TradeType
    function tradeTypeFromString(string memory t) internal pure returns (TradeType) {
        if (keccak256(bytes(t)) == keccak256(bytes("BUY"))) return TradeType.BUY;
        if (keccak256(bytes(t)) == keccak256(bytes("SELL"))) return TradeType.SELL;
        revert("Invalid trade type");
    }

    // ✅ Record trade
    function recordTrade(
        string memory symbolStr, 
        string memory tradeTypeStr,
        uint quantity, 
        uint price
    ) public {
        require(quantity > 0 && price > 0 && bytes(symbolStr).length > 0);

        TradeType tradeType = tradeTypeFromString(tradeTypeStr);
        bytes32 symbol = bytes32(bytes(symbolStr));

        trades.push(Trade({
            tradeId: tradeCounter,
            user: msg.sender,
            symbol: symbol,
            tradeType: tradeType,
            quantity: quantity,
            price: price,
            timestamp: block.timestamp
        }));

        emit TradeRecorded(tradeCounter, msg.sender, symbol, tradeType, quantity, price);
        tradeCounter++;
    }

    // ✅ Get all trades (ethers-compatible)
    function getAllTrades() public view returns (
        uint[] memory tradeIds,
        address[] memory users,
        bytes32[] memory symbols,
        uint8[] memory tradeTypes,
        uint[] memory quantities,
        uint[] memory prices,
        uint[] memory timestamps
    ) {
        uint n = trades.length;
        tradeIds = new uint[](n);
        users = new address[](n);
        symbols = new bytes32[](n);
        tradeTypes = new uint8[](n);
        quantities = new uint[](n);
        prices = new uint[](n);
        timestamps = new uint[](n);

        for (uint i = 0; i < n; i++) {
            Trade storage t = trades[i];
            tradeIds[i] = t.tradeId;
            users[i] = t.user;
            symbols[i] = t.symbol;
            tradeTypes[i] = uint8(t.tradeType);
            quantities[i] = t.quantity;
            prices[i] = t.price;
            timestamps[i] = t.timestamp;
        }
    }
}
