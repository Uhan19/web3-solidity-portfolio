import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const whitelist = ["0x08b08b3b5e39b9735816490674f6bb17aff8bd93"];
  const treasury = "0xB451728178341a0A7053B162c9525731877a3655";
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Ico = await ethers.getContractFactory("ICO");
  const ico = await Ico.deploy(whitelist, treasury);
  const spacecoin = await ethers.getContractAt(
    "SpaceCoin",
    await ico.SPC_ADDRESS()
  );
  const SpaceLP = await ethers.getContractFactory("SpaceLP");
  const spaceLP = await SpaceLP.deploy(spacecoin.address);
  const SpaceRouter = await ethers.getContractFactory("SpaceRouter");
  const spaceRouter = await SpaceRouter.deploy(
    spaceLP.address,
    spacecoin.address
  );

  console.log("Ico address:", ico.address);
  console.log("spacecoin address", spacecoin.address);
  console.log("spaceRouter address", spaceRouter.address);
  console.log("spaceLP address", spaceLP.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
