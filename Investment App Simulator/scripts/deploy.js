async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    const Factory = await ethers.getContractFactory("TradeLedger");
    const ledger = await Factory.deploy();
    await ledger.waitForDeployment?.();
    console.log("Deployed to:", ledger.target || ledger.address);
  }
  main().catch(e=>{console.error(e); process.exit(1);});
  
  