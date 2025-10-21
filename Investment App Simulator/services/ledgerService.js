// services/ledgerService.js
require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('../artifacts/contracts/TradeLedger.sol/TradeLedger.json').abi; // path from Hardhat build
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const ledger = new ethers.Contract(process.env.LEDGER_ADDRESS, abi, wallet);

async function recordTradeOnChain({ userAddr = ethers.ZeroAddress, userId = 0, symbol, instrumentType='OPTION', side, quantity, price, scaleFactor = 10000 }) {
  const scaledPrice = Math.round(Number(price) * scaleFactor);
  const tx = await ledger.recordTrade(userAddr, userId, symbol, instrumentType, side, quantity, scaledPrice);
  const receipt = await tx.wait();
  // compute gas cost
  const gasUsed = receipt.gasUsed ?? BigInt(0);
  const gasPrice = receipt.effectiveGasPrice ?? BigInt(0);
  const gasCostWei = gasUsed * gasPrice;
  const gasCostEth = gasCostWei > 0n ? ethers.formatEther(gasCostWei) : '0';
  // find event id
  let onChainId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = ledger.interface.parseLog(log);
      if (parsed.name === 'TradeRecorded') {
        onChainId = parsed.args.id.toString();
        break;
      }
    } catch(e) {}
  }
  return { txHash: receipt.transactionHash || receipt.hash, blockNumber: receipt.blockNumber, gasUsed: gasUsed.toString(), gasCostEth, onChainId };
}

module.exports = { recordTradeOnChain };
