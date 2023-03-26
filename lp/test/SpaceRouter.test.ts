/* eslint-disable camelcase */
// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this second project, we've provided dramatically reduce the amount
  of provided scaffolding in your test suite. We've done this to:

    1. Take the training wheels off, while still holding you accountable to the
       level of testing required. (Illustrated in the previous projects test suite.)
    2. Instead, redirect your attention to the next testing lesson; a more advanced
       testing feature we'll use called fixtures! (See comments below, where
       beforeEach used to be!)

  Please note that:

    - You will still find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace it with
      whatever is appropriate.

    - You're free to edit the setupFixture function if you need to due to a
      difference in your design choices while implementing your contracts.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ICO, SpaceCoin, SpaceLP, SpaceRouter } from "../typechain-types"; // eslint-disable-line

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const POINT_FIVE_ETHER: BigNumber = ethers.utils.parseEther("0.5");
const FIVE_SPC: BigNumber = ethers.utils.parseEther("5");
const TEN_ETHER: BigNumber = ethers.utils.parseEther("10");
const FIFTY_SPC: BigNumber = ethers.utils.parseEther("50");
const INITIAL_TREASURY = ethers.utils.parseEther("350000");
const FIVE_SPC_MINUS_TAX = FIVE_SPC.sub(FIVE_SPC.mul(2).div(100));
const FIFTY_SPC_MINUS_TAX = FIFTY_SPC.sub(FIFTY_SPC.mul(2).div(100));

// 50 - (50*2/100) =

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number): Promise<number> => {
  return time.increase(seconds);
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const timeTravelTo = async (seconds: number): Promise<void> => {
  return time.increaseTo(seconds);
};

// Compare two BigNumbers that are close to one another.
//
// This is useful for when you want to compare the balance of an address after
// it executes a transaction, and you don't want to worry about accounting for
// balances changes due to paying for gas a.k.a. transaction fees.
const closeTo = async (
  a: BigNumberish,
  b: BigNumberish,
  margin: BigNumberish
) => {
  expect(a).to.be.closeTo(b, margin);
};

// ----------------------------------------------------------------------------

describe("SpaceRouter", () => {
  async function setupFixture() {
    const [deployer, treasury, alice, bob]: SignerWithAddress[] =
      await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       ICO contract's constructor has input parameters
    const ICO = await ethers.getContractFactory("ICO");
    const ico: ICO = (await ICO.deploy(
      [alice.address, bob.address],
      treasury.address
    )) as ICO;
    await ico.deployed();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       SpaceCoin contract's constructor has input parameters
    const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    const spacecoin: SpaceCoin = (await SpaceCoin.deploy(
      deployer.address,
      treasury.address,
      ico.address
    )) as SpaceCoin;
    await spacecoin.deployed();

    const SpaceLP = await ethers.getContractFactory("SpaceLP");
    const spacelp: SpaceLP = (await SpaceLP.deploy(
      spacecoin.address
    )) as SpaceLP;
    await spacelp.deployed();

    const SpaceRouter = await ethers.getContractFactory("SpaceRouter");
    const spacerouter = (await SpaceRouter.deploy(
      spacelp.address,
      spacecoin.address
    )) as SpaceRouter;
    await spacerouter.deployed();

    return {
      deployer,
      alice,
      bob,
      treasury,
      spacelp,
      spacecoin,
      spacerouter,
      ico,
    };
  }

  describe("deploys correctly", () => {
    it("should deploy the SpaceRouter contract", async () => {
      const { spacerouter } = await loadFixture(setupFixture);
      expect(spacerouter.address).to.be.properAddress;
    });

    it("should set the spacecoin and spacelp address correcly during initialization", async () => {
      const { spacerouter, spacecoin, spacelp } = await loadFixture(
        setupFixture
      );
      expect(await spacerouter.spaceCoin()).to.equal(spacecoin.address);
      expect(await spacerouter.spaceLP()).to.equal(spacelp.address);
    });
  });

  describe("Add liquidity", () => {
    it("should add liquidity to the pool - tax off", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIVE_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIVE_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIVE_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIVE_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      expect(await spacecoin.balanceOf(alice.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(FIVE_SPC);
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        ONE_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
    });

    it("should add liquidity to the pool - tax on", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIVE_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIVE_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIVE_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIVE_SPC);
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC_MINUS_TAX))
      ).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC_MINUS_TAX))
      );
      expect(await spacecoin.balanceOf(alice.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(
        FIVE_SPC_MINUS_TAX
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC_MINUS_TAX);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        ONE_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
    });

    it("should add liquidity to the pool with balance, too much ETH - tax on", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      expect(await spacecoin.balanceOf(alice.address)).to.equal(
        FIFTY_SPC.sub(FIVE_SPC)
      );
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(FIVE_SPC);
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        ONE_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      const FOUR_NINE_SPC = ethers.utils.parseEther("4.9");
      const NINE_EIGHT_ETH = ethers.utils.parseEther("0.98");
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ethers.utils.parseEther("2") });
      const moreLpToken = (
        await spacelp.sqrt(NINE_EIGHT_ETH.mul(FOUR_NINE_SPC))
      ).sub(1000);
      expect(
        await (await spacelp.totalSupply()).sub(lpToken.add(moreLpToken))
      ).to.be.lessThanOrEqual(ethers.utils.parseEther("0.00000000000001"));
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC.add(FOUR_NINE_SPC));
      expect(await spacelp.ethBalance()).to.equal(
        ONE_ETHER.add(NINE_EIGHT_ETH)
      );
    });

    it("Adds liquidity with funds already in the pool - tax off", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      const lpToken = (await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC))
      );
      expect(await spacecoin.balanceOf(alice.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(FIFTY_SPC);
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        TEN_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);

      // bob contributes 1 ETH and 5 SPC to the LP, which already has 10 ETH and 50 SPC
      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIVE_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIVE_SPC);
      await spacerouter
        .connect(bob)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const additionalLpToken = await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC));
      expect(await spacelp.balanceOf(bob.address)).to.equal(additionalLpToken);
      const totalETH = TEN_ETHER.add(ONE_ETHER);
      const totalSPC = FIFTY_SPC.add(FIVE_SPC);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(totalETH.mul(totalSPC))
      );
      expect(await spacecoin.balanceOf(bob.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(totalSPC);
      expect(await spacelp.spcBalance()).to.equal(totalSPC);
      expect(await spacelp.ethBalance()).to.equal(totalETH);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        totalETH
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
    });

    it("Adds liquidity with funds already in the pool - tax on", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      // approve and transfer funds for alice
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);

      // approve and transfer funds for bob
      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIVE_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIVE_SPC);

      // turn tax on
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);

      // initial deposit to LP with tax on
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      const lpToken = (
        await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC_MINUS_TAX))
      ).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      const totalSupply = await spacelp.sqrt(
        TEN_ETHER.mul(FIFTY_SPC_MINUS_TAX)
      );
      expect(await spacelp.totalSupply()).to.equal(totalSupply);
      expect(await spacecoin.balanceOf(alice.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(
        FIFTY_SPC_MINUS_TAX
      );
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC_MINUS_TAX);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        TEN_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);

      // bob contributes 1 ETH and 5 SPC to the LP, which already has 10 ETH and 50 SPC
      await spacerouter
        .connect(bob)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const additionalLpToken = await (await spacelp.totalSupply())
        .mul(FIVE_SPC_MINUS_TAX)
        .div(await spacelp.spcBalance());
      expect(await spacelp.balanceOf(bob.address)).to.equal(additionalLpToken);
      const totalETH = TEN_ETHER.add(ONE_ETHER);
      const totalSPC = FIFTY_SPC_MINUS_TAX.add(FIVE_SPC_MINUS_TAX);
      expect(await spacelp.totalSupply()).to.equal(
        totalSupply.add(additionalLpToken)
      );
      expect(await spacecoin.balanceOf(bob.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(totalSPC);
      expect(await spacelp.spcBalance()).to.equal(totalSPC);
      expect(await spacelp.ethBalance()).to.equal(totalETH);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        totalETH
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
    });

    it("Adds liquidity with extra eth - tax off", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: ONE_ETHER });
      const additionalLpToken = await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC));
      const totalLpToken = additionalLpToken.add(lpToken);
      expect(await spacecoin.balanceOf(alice.address)).to.equal(
        FIFTY_SPC.sub(FIVE_SPC.mul(2))
      );
      expect(await spacelp.balanceOf(alice.address)).to.equal(totalLpToken);
      expect(await spacelp.spcBalance()).to.equal(
        ethers.utils.parseEther("10")
      );
      expect(await spacelp.ethBalance()).to.equal(ethers.utils.parseEther("2"));
      expect(await spacelp.totalSupply()).to.equal(totalLpToken.add(1000));
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(
        ethers.utils.parseEther("10")
      );
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        ethers.utils.parseEther("2")
      );
    });

    it("Adds liquidity with extra spc - tax off", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: ONE_ETHER });
      const additionalLpToken = await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC));
      const totalLpToken = additionalLpToken.add(lpToken);
      expect(await spacelp.balanceOf(alice.address)).to.equal(totalLpToken);
      expect(await spacelp.spcBalance()).to.equal(
        ethers.utils.parseEther("10")
      );
      expect(await spacelp.ethBalance()).to.equal(ethers.utils.parseEther("2"));
      expect(await spacelp.totalSupply()).to.equal(totalLpToken.add(1000));
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(
        ethers.utils.parseEther("10")
      );
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        ethers.utils.parseEther("2")
      );
    });

    it("Reverts if adding 0 liquidity", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await expect(
        spacerouter
          .connect(alice)
          .addLiquidity(ethers.utils.parseEther("0"), { value: ONE_ETHER })
      ).to.be.revertedWithCustomError(spacelp, "NotEnoughFundsProvided");
      await expect(
        spacerouter
          .connect(alice)
          .addLiquidity(FIVE_SPC, { value: ethers.utils.parseEther("0") })
      ).to.be.revertedWithCustomError(spacelp, "NotEnoughFundsProvided");

      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);

      await expect(
        spacerouter
          .connect(alice)
          .addLiquidity(FIVE_SPC, { value: ethers.utils.parseEther("0") })
      ).to.be.revertedWithCustomError(spacelp, "NotEnoughFundsProvided");
    });

    it("Adds liquidity with slightly more SPC - tax on", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);

      // deposit 5 spc and 1 eth to LP, 1:5 ratio
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(
        await (await spacelp.spcBalance()).div(await spacelp.ethBalance())
      ).to.equal(5);

      const initialK = (await spacelp.spcBalance()).mul(
        await spacelp.ethBalance()
      );

      // turn tax on, and deposit slightly more SPC amounts
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      const SLIGHTLY_MORE_THAN_OPTIMAL_BEFORE_TAX_SPC =
        ethers.utils.parseEther("2.5511");
      await spacerouter
        .connect(alice)
        .addLiquidity(SLIGHTLY_MORE_THAN_OPTIMAL_BEFORE_TAX_SPC, {
          value: POINT_FIVE_ETHER,
        });
      const OPTIMAL_SPC = ethers.utils.parseEther("2.5");
      const k = ONE_ETHER.add(POINT_FIVE_ETHER).mul(FIVE_SPC.add(OPTIMAL_SPC));
      expect(await spacelp.totalSupply()).to.equal(await spacelp.sqrt(k));
      expect(await spacelp.balanceOf(alice.address)).to.equal(
        await (await spacelp.sqrt(k)).sub(1000)
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC.add(OPTIMAL_SPC));
      expect(await spacelp.ethBalance()).to.equal(
        ONE_ETHER.add(POINT_FIVE_ETHER)
      );
      // check that pool ratio is preserved
      expect(
        await (await spacelp.spcBalance()).div(await spacelp.ethBalance())
      ).to.equal(5);

      const finalK = (await spacelp.spcBalance()).mul(
        await spacelp.ethBalance()
      );

      // check that k is increased after adding liquidity
      expect(finalK).to.greaterThanOrEqual(initialK);
    });

    // adds liquidity with extra spc - tax on
    it("Adds liquidity with slightly less spc - tax on", async () => {
      const { treasury, spacerouter, spacecoin, spacelp, alice } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);

      // deposit 5 spc and 1 eth to LP, 1:5 ratio
      await spacerouter
        .connect(alice)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(
        await (await spacelp.spcBalance()).div(await spacelp.ethBalance())
      ).to.equal(5);

      const initialK = (await spacelp.spcBalance()).mul(
        await spacelp.ethBalance()
      );

      // turn tax on, and deposit slightly less SPC amounts
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      const SLIGHTLY_LESS_THAN_OPTIMAL_BEFORE_TAX_SPC =
        ethers.utils.parseEther("2.54");
      await spacerouter
        .connect(alice)
        .addLiquidity(SLIGHTLY_LESS_THAN_OPTIMAL_BEFORE_TAX_SPC, {
          value: POINT_FIVE_ETHER,
        });

      const OPTIMAL_SPC = SLIGHTLY_LESS_THAN_OPTIMAL_BEFORE_TAX_SPC.sub(
        SLIGHTLY_LESS_THAN_OPTIMAL_BEFORE_TAX_SPC.mul(2).div(100)
      );
      const OPTIMAL_ETH = ONE_ETHER.mul(OPTIMAL_SPC).div(FIVE_SPC);
      const k = ONE_ETHER.add(OPTIMAL_ETH).mul(FIVE_SPC.add(OPTIMAL_SPC));
      expect(await spacelp.totalSupply()).to.equal(await spacelp.sqrt(k));
      expect(await spacelp.balanceOf(alice.address)).to.equal(
        await (await spacelp.sqrt(k)).sub(1000)
      );
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC.add(OPTIMAL_SPC));
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER.add(OPTIMAL_ETH));
      // check that pool ratio is preserved
      expect(
        await (await spacelp.spcBalance()).div(await spacelp.ethBalance())
      ).to.equal(5);

      const finalK = (await spacelp.spcBalance()).mul(
        await spacelp.ethBalance()
      );

      // check that k is increased after adding liquidity
      expect(finalK).to.greaterThanOrEqual(initialK);
    });
  });

  describe("Remove liquidity", () => {
    it("Removes liquidity - tax off", async () => {
      const {
        deployer,
        treasury,
        spacerouter,
        spacecoin,
        spacelp,
        alice,
        bob,
      } = await loadFixture(setupFixture);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      const lpToken = (await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC))
      );
      expect(await spacecoin.balanceOf(alice.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(FIFTY_SPC);
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        TEN_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);

      // bob contributes 1 ETH and 5 SPC to the LP, which already has 10 ETH and 50 SPC
      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIVE_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIVE_SPC);
      await spacerouter
        .connect(bob)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const additionalLpToken = await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC));
      expect(await spacelp.balanceOf(bob.address)).to.equal(additionalLpToken);
      const totalETH = TEN_ETHER.add(ONE_ETHER);
      const totalSPC = FIFTY_SPC.add(FIVE_SPC);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(totalETH.mul(totalSPC))
      );
      expect(await spacecoin.balanceOf(bob.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(totalSPC);
      expect(await spacelp.spcBalance()).to.equal(totalSPC);
      expect(await spacelp.ethBalance()).to.equal(totalETH);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        totalETH
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);

      // bob removes liquidity
      await spacelp.increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacelp.allowance(deployer.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacelp.connect(bob).approve(spacerouter.address, FIVE_SPC);
      const lpTokenToRemove = ethers.utils.parseEther("1");
      await spacerouter.connect(bob).removeLiquidity(lpTokenToRemove);
    });

    it("Removes 40% liquidity - tax off", async () => {
      const {
        deployer,
        treasury,
        spacerouter,
        spacecoin,
        spacelp,
        alice,
        bob,
      } = await loadFixture(setupFixture);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      const lpToken = (await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC))).sub(1000);
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(TEN_ETHER.mul(FIFTY_SPC))
      );

      expect(await spacecoin.balanceOf(alice.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(FIFTY_SPC);
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        TEN_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIVE_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIVE_SPC);
      await spacerouter
        .connect(bob)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const additionalLpToken = await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC));
      expect(await spacelp.balanceOf(bob.address)).to.equal(additionalLpToken);
      const totalETH = TEN_ETHER.add(ONE_ETHER);
      const totalSPC = FIFTY_SPC.add(FIVE_SPC);
      const totalLpSupply = await spacelp.sqrt(totalETH.mul(totalSPC));
      expect(await spacelp.totalSupply()).to.equal(totalLpSupply);
      expect(await spacecoin.balanceOf(bob.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(totalSPC);
      expect(await spacelp.spcBalance()).to.equal(totalSPC);
      expect(await spacelp.ethBalance()).to.equal(totalETH);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        totalETH
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);

      // bob removes 50% of his deposits

      const fortyPercentLpTokens = (await spacelp.balanceOf(bob.address))
        .mul(40)
        .div(100);
      const bobTotalLpTokens = await spacelp.balanceOf(bob.address);
      await spacelp.increaseAllowance(bob.address, fortyPercentLpTokens);
      expect(await spacelp.allowance(deployer.address, bob.address)).to.equal(
        fortyPercentLpTokens
      );
      await spacelp
        .connect(bob)
        .approve(spacerouter.address, fortyPercentLpTokens);
      await spacerouter.connect(bob).removeLiquidity(fortyPercentLpTokens);
      expect(await spacelp.balanceOf(bob.address)).to.equal(
        bobTotalLpTokens.sub(fortyPercentLpTokens)
      );
      expect(await spacelp.totalSupply()).to.equal(
        totalLpSupply.sub(fortyPercentLpTokens)
      );
      expect(
        await (
          await spacelp.spcBalance()
        ).sub(FIFTY_SPC.add(FIVE_SPC).sub(FIVE_SPC.mul(40).div(100)))
      ).to.be.lessThanOrEqual(ethers.utils.parseEther("0.0000000000000001"));
      expect(
        await (
          await spacelp.ethBalance()
        ).sub(TEN_ETHER.add(ONE_ETHER).sub(ONE_ETHER.mul(40).div(100)))
      ).to.be.lessThanOrEqual(ethers.utils.parseEther("0.0000000000000001"));
    });

    it("Reverts if not enough LP token balance", async () => {
      const { deployer, spacerouter, spacelp, bob } = await loadFixture(
        setupFixture
      );
      await spacelp.increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacelp.allowance(deployer.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacelp.connect(bob).approve(spacerouter.address, FIVE_SPC);
      const lpTokenToRemove = ethers.utils.parseEther("1");
      await expect(
        spacerouter.connect(bob).removeLiquidity(lpTokenToRemove)
      ).to.be.revertedWithCustomError(spacerouter, "LpTokenBalanceExceeded");
    });

    it("Reverts if 0 LP token sent", async () => {
      const { deployer, spacecoin, treasury, spacerouter, spacelp, bob } =
        await loadFixture(setupFixture);

      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIVE_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIVE_SPC);
      await spacerouter
        .connect(bob)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      await spacelp.increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacelp.allowance(deployer.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacelp.connect(bob).approve(spacerouter.address, FIVE_SPC);
      await expect(
        spacerouter.connect(bob).removeLiquidity(0)
      ).to.be.revertedWithCustomError(spacelp, "ZeroTokenBalance");
    });

    it("Reverts if total token supply = 0", async () => {
      const { deployer, spacerouter, spacelp, bob } = await loadFixture(
        setupFixture
      );
      await spacelp.increaseAllowance(bob.address, FIVE_SPC);
      expect(await spacelp.allowance(deployer.address, bob.address)).to.equal(
        FIVE_SPC
      );
      await spacelp.connect(bob).approve(spacerouter.address, FIVE_SPC);
      const lpTokenToRemove = ethers.utils.parseEther("1");
      await expect(
        spacerouter.connect(bob).removeLiquidity(lpTokenToRemove)
      ).to.be.revertedWithCustomError(spacerouter, "LpTokenBalanceExceeded");
    });
  });

  describe("Swap ETH for SPC", async () => {
    it("Swaps eth for spc - tax off", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      // swap eth for spc
      await spacerouter
        .connect(bob)
        .swapETHForSPC(ethers.utils.parseEther("4"), { value: ONE_ETHER });
      const expectedSpcOut = 50 - (10 * 50) / (10 + (1 - 1 / 100));
      expect(
        await (
          await spacecoin.balanceOf(bob.address)
        ).sub(ethers.utils.parseEther(expectedSpcOut.toString()))
      ).lessThanOrEqual(ethers.utils.parseEther("0.0000000000001"));
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER.add(ONE_ETHER));
    });

    it("Swaps eth for spc - tax on", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC_MINUS_TAX);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      await spacerouter
        .connect(bob)
        .swapETHForSPC(ethers.utils.parseEther("4"), { value: ONE_ETHER });
      // 49 because 50 - 2% tax
      const expectedSpcOut = 49 - (10 * 49) / (10 + (1 - 1 / 100));
      const expectedSpcOutMinusTax =
        expectedSpcOut - (expectedSpcOut * 2) / 100;
      expect(
        await (
          await spacecoin.balanceOf(bob.address)
        ).sub(ethers.utils.parseEther(expectedSpcOutMinusTax.toString()))
      ).lessThanOrEqual(ethers.utils.parseEther("0.00000000000001"));
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER.add(ONE_ETHER));
    });

    it("Swaps eth for spc - more than slippage, revert", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC_MINUS_TAX);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);
      await expect(
        spacerouter
          .connect(bob)
          .swapETHForSPC(ethers.utils.parseEther("6"), { value: ONE_ETHER })
      ).to.be.revertedWithCustomError(spacerouter, "SlippageExceeded");
    });

    it("Revert if not enough eth", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      // swap eth for spc
      await expect(
        spacerouter.connect(bob).swapETHForSPC(0)
      ).to.be.revertedWithCustomError(spacerouter, "InsufficientETHDeposit");
    });

    it("Revert if not enough spc", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      // swap eth for spc
      await expect(
        spacerouter.connect(bob).swapSPCForETH(0, 0)
      ).to.be.revertedWithCustomError(spacerouter, "InsufficientSPCDeposit");
    });
  });

  describe("Swap SPC for ETH", () => {
    it("Swaps spc for eth - tax off", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIFTY_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIFTY_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIFTY_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIFTY_SPC);
      // swap eth for spc
      await spacerouter
        .connect(bob)
        .swapSPCForETH(FIVE_SPC, ethers.utils.parseEther("0.8"));
      const expectedEthBalance = (50 * 10) / (50 + (5 - 5 / 100));
      const expectedEthOut = 10 - expectedEthBalance;
      expect(await spacelp.ethBalance()).to.equal(
        await ethers.provider.getBalance(spacelp.address)
      );
      expect(
        await (
          await ethers.provider.getBalance(spacelp.address)
        ).add(ethers.utils.parseEther(expectedEthOut.toString()))
      ).lessThanOrEqual(ethers.utils.parseEther("10"));
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC.add(FIVE_SPC));
      expect(
        await (
          await ethers.provider.getBalance(spacelp.address)
        ).sub(ethers.utils.parseEther(expectedEthBalance.toString()))
      ).lessThanOrEqual(ethers.utils.parseEther("0.0000000000001"));
    });

    it("Swaps spc for eth - tax on", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIFTY_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIFTY_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIFTY_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIFTY_SPC);

      // turn tax on
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);

      // swap eth for spc
      await spacerouter
        .connect(bob)
        .swapSPCForETH(FIVE_SPC, ethers.utils.parseEther("0.8"));
      const expectedEthBalance = (50 * 10) / (50 + (4.9 - 4.9 / 100));
      const expectedEthOut = 10 - expectedEthBalance;
      expect(await spacelp.ethBalance()).to.equal(
        await ethers.provider.getBalance(spacelp.address)
      );
      expect(await spacelp.spcBalance()).to.equal(
        FIFTY_SPC.add(FIVE_SPC_MINUS_TAX)
      );
      expect(
        await (
          await ethers.provider.getBalance(spacelp.address)
        ).sub(ethers.utils.parseEther(expectedEthBalance.toString()))
      ).lessThanOrEqual(ethers.utils.parseEther("0.0000000000001"));
    });

    it("Swaps spc for eth - more than slippage, revert", async () => {
      const { treasury, spacerouter, spacelp, spacecoin, alice, bob } =
        await loadFixture(setupFixture);
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin
        .connect(treasury)
        .increaseAllowance(alice.address, FIFTY_SPC);
      expect(
        await spacecoin.allowance(treasury.address, alice.address)
      ).to.equal(FIFTY_SPC);
      await spacecoin.connect(treasury).transfer(alice.address, FIFTY_SPC);
      await spacecoin.connect(alice).approve(spacerouter.address, FIFTY_SPC);
      await spacerouter
        .connect(alice)
        .addLiquidity(FIFTY_SPC, { value: TEN_ETHER });
      expect(await spacelp.spcBalance()).to.equal(FIFTY_SPC);
      expect(await spacelp.ethBalance()).to.equal(TEN_ETHER);

      await spacecoin
        .connect(treasury)
        .increaseAllowance(bob.address, FIFTY_SPC);
      expect(await spacecoin.allowance(treasury.address, bob.address)).to.equal(
        FIFTY_SPC
      );
      await spacecoin.connect(treasury).transfer(bob.address, FIFTY_SPC);
      await spacecoin.connect(bob).approve(spacerouter.address, FIFTY_SPC);

      // turn tax on
      await spacecoin.toggleTax();
      expect(await spacecoin.taxEnabled()).to.equal(true);
      const expectedEthBalance = (50 * 10) / (50 + (4.9 - 4.9 / 100));
      const expectedEthOut = 10 - expectedEthBalance;
      // swap eth for spc
      await expect(
        spacerouter
          .connect(bob)
          .swapSPCForETH(FIVE_SPC, ethers.utils.parseEther("1"))
      ).to.be.revertedWithCustomError(spacerouter, "SlippageExceeded");
    });
  });

  describe("E2E flow", () => {
    it("Should test e2e flow from ICO to depositing to LP", async () => {
      const { ico, alice, treasury, spacecoin, spacerouter, spacelp } =
        await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("10");

      // seed phase contribution
      expect(await ico.currentPhase()).to.equal(0);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);

      // general phase contribution
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(
        amount.add(amount)
      );
      expect(await ico.totalContributions()).to.equal(amount.add(amount));

      const totalEthAmount = amount.add(amount.add(amount));
      // open phase contribution
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(totalEthAmount);
      expect(await ico.totalContributions()).to.equal(totalEthAmount);

      // withdraw funds
      expect(await ethers.provider.getBalance(ico.address)).to.equal(
        totalEthAmount
      );
      expect(await ico.connect(treasury).withdraw()).to.be.ok;
      expect(await ethers.provider.getBalance(ico.address)).to.equal(0);

      // deposit to LP
      expect(await spacecoin.taxEnabled()).to.equal(false);
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        INITIAL_TREASURY
      );
      await spacecoin.connect(treasury).approve(spacerouter.address, FIVE_SPC);
      await spacerouter
        .connect(treasury)
        .addLiquidity(FIVE_SPC, { value: ONE_ETHER });
      const lpToken = (await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))).sub(1000);
      expect(await spacelp.balanceOf(treasury.address)).to.equal(lpToken);
      expect(await spacelp.totalSupply()).to.equal(
        await spacelp.sqrt(ONE_ETHER.mul(FIVE_SPC))
      );
      const treasuryInitSPCBalance = ethers.utils.parseEther("350000");
      expect(await spacecoin.balanceOf(treasury.address)).to.equal(
        treasuryInitSPCBalance.sub(FIVE_SPC)
      );
      expect(await spacecoin.balanceOf(spacerouter.address)).to.equal(0);
      expect(await spacecoin.balanceOf(spacelp.address)).to.equal(FIVE_SPC);
      expect(await spacelp.spcBalance()).to.equal(FIVE_SPC);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(await ethers.provider.getBalance(spacelp.address)).to.equal(
        ONE_ETHER
      );
      expect(await ethers.provider.getBalance(spacerouter.address)).to.equal(0);
    });
  });
});
