import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const whitelist = ["0x08b08b3b5e39b9735816490674f6bb17aff8bd93"];
  const treasury = "0x08B08B3B5e39b9735816490674f6bB17AFf8bD93";
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Ico = await ethers.getContractFactory("ICO");
  const ico = await Ico.deploy(whitelist, treasury);
  const spacecoin = await ethers.getContractAt(
    "SpaceCoin",
    await ico.SPC_ADDRESS()
  );

  console.log("Ico address:", ico.address);
  console.log("spacecoin address", await spacecoin.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
