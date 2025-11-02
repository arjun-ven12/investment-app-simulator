

import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const TRADE_LEDGER_ADDRESS = process.env.LEDGER_ADDRESS;
const OPTION_LEDGER_ADDRESS = process.env.OPTIONS_LEDGER_ADDRESS;

const tradeLedgerABI = [
  "event TradeRecorded(uint indexed tradeId, address user, bytes32 symbol, uint8 tradeType, uint quantity, uint price)",
  "function getAllTrades() view returns (uint[] tradeIds, address[] users, bytes32[] symbols, uint8[] tradeTypes, uint[] quantities, uint[] prices, uint[] timestamps)"
];

const optionLedgerABI = [
  "event OptionTradeRecorded(uint indexed tradeId, address user, uint contractId, uint8 tradeType, uint8 orderType, uint quantity, uint price, int totalPnL, uint totalAmount, bool isSettled)",
  "function getAllOptionTrades() view returns (tuple(uint tradeId, address user, uint contractId, uint8 tradeType, uint8 orderType, uint quantity, uint price, int totalPnL, uint totalAmount, uint timestamp, bool isSettled)[])"
];

const tradeLedger = new ethers.Contract(TRADE_LEDGER_ADDRESS, tradeLedgerABI, provider);
const optionLedger = new ethers.Contract(OPTION_LEDGER_ADDRESS, optionLedgerABI, provider);

export const getUnifiedTrades = async (req, res) => {
  try {
    // --- Stock Trades ---
    const tradeResult = await tradeLedger.getAllTrades();

    const tradeIds = tradeResult[0];
    const users = tradeResult[1];
    const symbols = tradeResult[2];
    const tradeTypes = tradeResult[3];
    const quantities = tradeResult[4];
    const prices = tradeResult[5];
    const timestamps = tradeResult[6];

    const stockTrades = tradeIds.map((tradeId, i) => ({
      tradeId: tradeId.toString(),
      user: users[i],
      symbol: ethers.decodeBytes32String(symbols[i]),
      tradeType: tradeTypes[i],
      quantity: quantities[i].toString(),
      price: prices[i].toString(),
      timestamp: Number(timestamps[i])
    }));

    // --- Option Trades ---
    const optionTradesRaw = await optionLedger.getAllOptionTrades();

    const optionTrades = optionTradesRaw.map(t => ({
      tradeId: t.tradeId.toString(),
      user: t.user,
      contractId: t.contractId,
      tradeType: t.tradeType,
      orderType: t.orderType,
      quantity: t.quantity.toString(),
      price: t.price.toString(),
      totalPnL: t.totalPnL.toString(),
      totalAmount: t.totalAmount.toString(),
      timestamp: Number(t.timestamp),
      isSettled: t.isSettled
    }));

    // --- Combine ---
    const allTrades = [...stockTrades, ...optionTrades];


const serializedTrades = await Promise.all(
      allTrades.map(async t => {
        let txHash = "N/A";
        let gasUsed = "N/A";
        let blockNumber = "N/A";

        try {
          const isOption = t.contractId !== undefined;
          const contract = isOption ? optionLedger : tradeLedger;

          const filter = isOption
            ? optionLedger.filters.OptionTradeRecorded(t.tradeId)
            : tradeLedger.filters.TradeRecorded(t.tradeId);

          const events = await contract.queryFilter(filter);

          if (events.length > 0) {
            txHash = events[0].transactionHash;
            const receipt = await provider.getTransactionReceipt(txHash);
            gasUsed = receipt.gasUsed.toString();
            blockNumber = receipt.blockNumber;
          }
        } catch (err) {
          console.warn(`Failed fetching tx info for tradeId ${t.tradeId}:`, err.message);
        }

        return {
          ...t,
          txHash,
          gasUsed,
          blockNumber,
          timestamp: new Date(Number(t.timestamp) * 1000).toLocaleString()
        };
      })
    );

    // ✅ Convert all BigInts in the entire object to strings before sending
    res.json(JSON.parse(
      JSON.stringify(serializedTrades, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    ));


  //  res.json(serializedTrades);
  } catch (err) {
    console.error("Error fetching unified trades:", err);
    res.status(500).json({ error: err.message });
  }
};
