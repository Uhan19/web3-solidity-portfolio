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
import { ICO, SpaceCoin } from "../typechain-types"; // eslint-disable-line

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

describe("SpaceCoin", () => {
  // See the Hardhat docs on fixture for why we're using them:
  // https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures

  // In particular, they allow you to run your tests in parallel using
  // `npx hardhat test --parallel` without the error-prone side-effects
  // that come from using mocha's `beforeEach`
  async function setupFixture() {
    const [deployer, alice, bob, treasury]: SignerWithAddress[] =
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

    return { ico, spaceCoin, deployer, alice, bob, treasury };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      // NOTE: We don't need to extract spaceCoin here because we don't use it
      // in this test. However, we'll need to extract it in tests that require it.
      const { spaceCoin } = await loadFixture(setupFixture);

      expect(spaceCoin.address).to.be.properAddress;
    });

    // it("Flags floating promises", async () => {
    //   // NOTE: This test is just for demonstrating/confirming that eslint is
    //   // set up to warn about floating promises.
    //   const { spaceCoin, deployer, alice, bob } = await loadFixture(
    //     setupFixture
    //   );

    //   const txReceiptUnresolved = await spaceCoin
    //     .connect(alice)
    //     .hinkleFinkleDo();
    //   expect(txReceiptUnresolved.wait()).to.be.reverted;
    // });
  });

  describe("Constructor", () => {
    it("Sets the correct treasury address", async () => {
      const { spaceCoin, treasury } = await loadFixture(setupFixture);
      expect(await spaceCoin.TREASURY()).to.equal(treasury.address);
    });

    it("Should set the owner correctly", async () => {
      const { spaceCoin, deployer } = await loadFixture(setupFixture);

      expect(await spaceCoin.OWNER()).to.equal(deployer.address);
    });

    it("mints the correct amount of tokens to treasury", async () => {
      const { spaceCoin, treasury } = await loadFixture(setupFixture);

      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseEther("350000")
      );
    });

    it("Mints the correct amount of tokens to the contract", async () => {
      const { spaceCoin, ico } = await loadFixture(setupFixture);

      expect(await spaceCoin.balanceOf(ico.address)).to.equal(
        ethers.utils.parseEther("150000")
      );
    });
  });

  describe("ToggleTax", () => {
    it("Should revert if not called by owner", async () => {
      const { spaceCoin, alice } = await loadFixture(setupFixture);

      expect(spaceCoin.connect(alice).toggleTax()).to.be.revertedWith(
        "Only the owner is allowed"
      );
    });

    it("Should toggle tax", async () => {
      const { spaceCoin, deployer } = await loadFixture(setupFixture);

      expect(await spaceCoin.taxEnabled()).to.equal(false);
      await spaceCoin.connect(deployer).toggleTax();
      expect(await spaceCoin.taxEnabled()).to.equal(true);
    });
  });

  describe("Transfers", () => {
    it("Should revert if transfer amount exceeds balance", async () => {
      const { spaceCoin, alice, bob } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("100");
      expect(
        spaceCoin.connect(alice).transfer(bob.address, amount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should transfer tokens without tax", async () => {
      const { spaceCoin, treasury, bob } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("100");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.taxEnabled()).to.equal(false);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      expect(await spaceCoin.balanceOf(bob.address)).to.equal(0);
      await spaceCoin.connect(treasury).transfer(bob.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(bob.address)).to.equal(amount);
    });

    it("Should transferFrom tokens without tax", async () => {
      const { spaceCoin, treasury, bob, alice } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("100");
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
        .transferFrom(treasury.address, bob.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount)
      );
      expect(await spaceCoin.balanceOf(bob.address)).to.equal(amount);
    });

    it("Should transfer tokens with tax", async () => {
      const { spaceCoin, deployer, treasury, bob } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("100");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      expect(await spaceCoin.balanceOf(bob.address)).to.equal(0);
      await spaceCoin.connect(deployer).toggleTax();
      expect(await spaceCoin.taxEnabled()).to.equal(true);
      await spaceCoin.connect(treasury).transfer(bob.address, amount);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount).add(amount.mul(2).div(100))
      );
      expect(await spaceCoin.balanceOf(bob.address)).to.equal(
        amount.sub(amount.mul(2).div(100))
      );
    });

    it("should transferFrom tokens with tax", async () => {
      const { spaceCoin, deployer, treasury, bob, alice } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("100");
      const initialTreasuryBalance = ethers.utils.parseEther("350000");
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      await spaceCoin.connect(deployer).toggleTax();
      expect(await spaceCoin.taxEnabled()).to.equal(true);
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, amount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(amount);
      await spaceCoin.connect(treasury).approve(alice.address, amount);
      await spaceCoin
        .connect(alice)
        .transferFrom(
          treasury.address,
          bob.address,
          ethers.utils.parseEther("100")
        );
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(amount).add(amount.mul(2).div(100))
      );
      expect(await spaceCoin.balanceOf(bob.address)).to.equal(
        amount.sub(amount.mul(2).div(100))
      );
    });

    it("Should revert if there is insufficient allowance", async () => {
      const { spaceCoin, alice, bob, treasury } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("100");
      expect(
        spaceCoin
          .connect(alice)
          .transferFrom(treasury.address, bob.address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should revert if there is insufficient allowance", async () => {
      const { spaceCoin, alice, bob, treasury } = await loadFixture(
        setupFixture
      );
      const amount = ethers.utils.parseEther("100");
      const insufficientAmount = ethers.utils.parseEther("1");
      await spaceCoin
        .connect(treasury)
        .increaseAllowance(alice.address, insufficientAmount);
      expect(
        await spaceCoin.allowance(treasury.address, alice.address)
      ).to.equal(insufficientAmount);
      await spaceCoin
        .connect(treasury)
        .approve(alice.address, insufficientAmount);
      expect(
        spaceCoin
          .connect(alice)
          .transferFrom(treasury.address, bob.address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
});
