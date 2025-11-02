
// async function main() {
//   const [deployer] = await ethers.getSigners();
//   console.log("Deploying with:", deployer.address);

//   // Deploy stock Trade Ledger
//   const TradeLedgerFactory = await ethers.getContractFactory("TradeLedger");
//   const tradeLedger = await TradeLedgerFactory.deploy();
//   await tradeLedger.waitForDeployment?.();
//   console.log("TradeLedger deployed to:", tradeLedger.target || tradeLedger.address);

//   // Deploy Options Ledger
//   const OptionsLedgerFactory = await ethers.getContractFactory("OptionsLedger");
//   const optionsLedger = await OptionsLedgerFactory.deploy();
//   await optionsLedger.waitForDeployment?.();
//   console.log("OptionsLedger deployed to:", optionsLedger.target || optionsLedger.address);
// }

// main().catch(error => {
//   console.error(error);
//   process.exit(1);
// });

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy TradeLedger
  const TradeLedgerFactory = await ethers.getContractFactory("TradeLedger");
  const tradeLedger = await TradeLedgerFactory.deploy();
  await tradeLedger.waitForDeployment();
  console.log("TradeLedger deployed to:", tradeLedger.target || tradeLedger.address);

  // Deploy OptionsLedger
  const OptionsLedgerFactory = await ethers.getContractFactory("OptionsLedger");
  const optionsLedger = await OptionsLedgerFactory.deploy();
  await optionsLedger.waitForDeployment();
  console.log("OptionsLedger deployed to:", optionsLedger.target || optionsLedger.address);

  // Optional: save addresses to .env.local
  const envFile = path.join(process.cwd(), ".env.local");
  const envContent = `LEDGER_ADDRESS=${tradeLedger.target || tradeLedger.address}\nOPTIONS_LEDGER_ADDRESS=${optionsLedger.target || optionsLedger.address}\n`;
  fs.writeFileSync(envFile, envContent, { encoding: "utf8" });
  console.log("Addresses saved to .env.local");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
