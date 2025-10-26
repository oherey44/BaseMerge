import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.BASE_MAINNET_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  if (!rpcUrl || !privateKey) {
    throw new Error("Missing BASE_MAINNET_RPC_URL or PRIVATE_KEY");
  }

  const artifactPath = path.join(__dirname, "../artifacts/contracts/DailyTicket.sol/DailyTicket.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("DailyTicket deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
