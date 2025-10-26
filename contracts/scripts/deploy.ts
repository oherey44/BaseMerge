import { ethers } from "hardhat";

async function main() {
  const DailyTicket = await ethers.getContractFactory("DailyTicket");
  const contract = await DailyTicket.deploy();
  await contract.waitForDeployment();
  console.log("DailyTicket deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
