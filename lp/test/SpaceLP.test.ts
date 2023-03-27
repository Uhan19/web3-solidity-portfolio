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
import { ICO, SpaceCoin, SpaceLP } from "../typechain-types"; // eslint-disable-line

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

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

describe("SpaceLP", function () {
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
    const spaceCoin: SpaceCoin = (await SpaceCoin.deploy(
      deployer.address,
      treasury.address,
      ico.address
    )) as SpaceCoin;
    await spaceCoin.deployed();

    const SpaceLP = await ethers.getContractFactory("SpaceLP");
    const spacelp: SpaceLP = (await SpaceLP.deploy(
      spaceCoin.address
    )) as SpaceLP;
    await spacelp.deployed();

    return { deployer, alice, bob, treasury, spacelp, spaceCoin };
  }

  describe("Deployment & Test Setup", () => {
    it("Should deploy the SpaceLP contract", async () => {
      const { spacelp } = await loadFixture(setupFixture);
      expect(spacelp.address).to.not.be.undefined;
    });

    it("Should set the SpaceCoin address correctly", async () => {
      const { spacelp, spaceCoin } = await loadFixture(setupFixture);
      expect(await spacelp.spaceCoin()).to.equal(spaceCoin.address);
    });
  });

  describe("Deposit", () => {
    it("Should allow a user to deposit SPC", async () => {
      const { spaceCoin, treasury, alice, spacelp } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(amount);
      spacelp.deposit(alice.address, { value: ONE_ETHER });
      expect(await spacelp.spcBalance()).to.be.equals(amount);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      const lpTokenReceived = (await spacelp.sqrt(ONE_ETHER.mul(amount))).sub(
        1000
      );
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpTokenReceived);
    });

    it("Revert if minimum liquidity is not met", async () => {
      const { spaceCoin, treasury, alice, spacelp } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const ONE_HUNDRED_WEI = ethers.utils.parseEther("0.0000000000000001");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, ONE_HUNDRED_WEI);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(ONE_HUNDRED_WEI)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(
        ONE_HUNDRED_WEI
      );
      await expect(
        spacelp.deposit(alice.address, { value: ONE_HUNDRED_WEI })
      ).to.be.revertedWithCustomError(spacelp, "InsufficientLiquidity");
    });

    it("Revert if zero balance is deposited", async () => {
      const { spaceCoin, treasury, alice, spacelp } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await expect(
        spacelp.deposit(alice.address, { value: ONE_ETHER })
      ).to.be.revertedWithCustomError(spacelp, "NotEnoughFundsProvided");
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      await expect(
        spacelp.deposit(alice.address, { value: 0 })
      ).to.be.revertedWithCustomError(spacelp, "NotEnoughFundsProvided");
    });
  });

  describe("Withdraw", () => {
    it("Revert when totalSupply = 0", async () => {
      const { spacelp, alice } = await loadFixture(setupFixture);
      await expect(
        spacelp.withdraw(alice.address)
      ).to.be.revertedWithCustomError(spacelp, "ZeroTokenTotalSupply");
    });

    it("Revert when lpBalance = 0", async () => {
      const { spaceCoin, treasury, alice, spacelp } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(amount);
      spacelp.deposit(alice.address, { value: ONE_ETHER });
      expect(await spacelp.spcBalance()).to.be.equals(amount);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      const lpTokenReceived = (await spacelp.sqrt(ONE_ETHER.mul(amount))).sub(
        1000
      );
      expect(await spacelp.balanceOf(alice.address)).to.equal(lpTokenReceived);
      await expect(
        spacelp.withdraw(alice.address)
      ).to.be.revertedWithCustomError(spacelp, "ZeroTokenBalance");
    });
  });

  describe("Swap", () => {
    it("Revert when spcBalance = 0", async () => {
      const { spacelp, alice } = await loadFixture(setupFixture);
      await expect(
        spacelp.swap(alice.address, true)
      ).to.be.revertedWithCustomError(spacelp, "InsufficientLiquidity");
    });
  });

  describe("getSwapPrice", () => {
    it("Should return SPC price quote if ETH passed in", async () => {
      const { spacelp, alice, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(amount);
      spacelp.deposit(alice.address, { value: ONE_ETHER });

      expect(await spacelp.spcBalance()).to.be.equals(amount);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(
        await spacelp.getSwapPrice(ethers.utils.parseEther("1"), 0)
      ).to.equal(ethers.utils.parseEther("2.487437185929648242"));
    });

    it("Should return ETH price quote if SPC passed in", async () => {
      const { spacelp, alice, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(amount);
      spacelp.deposit(alice.address, { value: ONE_ETHER });

      expect(await spacelp.spcBalance()).to.be.equals(amount);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      expect(
        await spacelp.getSwapPrice(0, ethers.utils.parseEther("1"))
      ).to.equal(ethers.utils.parseEther("0.165275459098497496"));
    });

    it("Should revert if 0 is passed in for both params", async () => {
      const { spacelp, alice, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(amount);
      spacelp.deposit(alice.address, { value: ONE_ETHER });

      expect(await spacelp.spcBalance()).to.be.equals(amount);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      await expect(spacelp.getSwapPrice(0, 0)).to.be.revertedWithCustomError(
        spacelp,
        "InvalidSwap"
      );
    });

    it("Should revert if non-zero is passed in for both params", async () => {
      const { spacelp, alice, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("5");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(treasury.address, spacelp.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(spacelp.address)).to.equal(amount);
      spacelp.deposit(alice.address, { value: ONE_ETHER });

      expect(await spacelp.spcBalance()).to.be.equals(amount);
      expect(await spacelp.ethBalance()).to.equal(ONE_ETHER);
      await expect(spacelp.getSwapPrice(1, 1)).to.be.revertedWithCustomError(
        spacelp,
        "InvalidSwap"
      );
    });
  });
});
