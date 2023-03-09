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
import { ICO } from "../typechain-types"; // eslint-disable-line

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

describe("ICO", () => {
  // See the Hardhat docs on fixture for why we're using them:
  // https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures

  // In particular, they allow you to run your tests in parallel using
  // `npx hardhat test --parallel` without the error-prone side-effects
  // that come from using mocha's `beforeEach`
  async function setupFixture() {
    const [
      deployer,
      alice,
      bob,
      treasury,
      vitalik,
      satoshi,
      nakamoto,
    ]: SignerWithAddress[] = await ethers.getSigners();
    const whitelist = [];
    const signers = await ethers.getSigners();
    const hacker = signers[19];
    for (let i = 0; i < signers.length - 1; i++) {
      whitelist.push(signers[i].address);
    }
    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       ICO contract's constructor has input parameters
    const ICO = await ethers.getContractFactory("ICO");
    const ico: ICO = (await ICO.deploy(whitelist, treasury.address)) as ICO;
    await ico.deployed();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       SpaceCoin contract's constructor has input parameters

    const spaceCoin = await ethers.getContractAt(
      "SpaceCoin",
      await ico.SPC_ADDRESS()
    );
    // const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    // const spaceCoin: SpaceCoin = (await SpaceCoin.deploy(
    //   deployer.address,
    //   treasury.address,
    //   ico.address
    // )) as SpaceCoin;
    // await spaceCoin.deployed();

    return {
      ico,
      spaceCoin,
      deployer,
      alice,
      bob,
      treasury,
      vitalik,
      satoshi,
      nakamoto,
      hacker,
    };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      // NOTE: We don't need to extract spaceCoin here because we don't use it
      // in this test. However, we'll need to extract it in tests that require it.
      const { ico } = await loadFixture(setupFixture);

      expect(ico.address).to.be.properAddress;
    });

    // it("Flags floating promises", async () => {
    //   // NOTE: This test is just for demonstrating/confirming that eslint is
    //   // set up to warn about floating promises.
    //   const { ico, deployer, alice, bob } = await loadFixture(setupFixture);

    //   const txReceiptUnresolved = await ico.connect(alice).advanceICOPhase();
    //   expect(txReceiptUnresolved.wait()).to.be.reverted;
    // });
  });

  describe("Constructor", () => {
    it("Sets the correct owner", async () => {
      const { ico, deployer } = await loadFixture(setupFixture);

      expect(await ico.OWNER()).to.equal(deployer.address);
    });

    it("Sets the correct seedWhiteList", async () => {
      const { ico, alice, bob } = await loadFixture(setupFixture);

      expect(await ico.seedWhiteList(alice.address)).to.be.true;
      expect(await ico.seedWhiteList(bob.address)).to.be.true;
    });
  });

  describe("AdvanceICOPhase", () => {
    it("Revert if non-owner calls advanceICOPhase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);

      await expect(ico.connect(alice).advanceICOPhase()).to.be.revertedWith(
        "Caller is not the owner"
      );
    });

    it("Should advance phase when called by owner", async () => {
      const { ico, deployer } = await loadFixture(setupFixture);

      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      await expect(ico.advanceICOPhase()).to.be.revertedWith(
        "ICO is already in open phase"
      );
    });

    it("Event 'PhaseAdvanced' should be emitted when phase is advanced", async () => {
      const { ico, deployer } = await loadFixture(setupFixture);

      await expect(ico.connect(deployer).advanceICOPhase()).to.emit(
        ico,
        "PhaseAdvanced"
      );
    });
  });

  describe("togglePauseState", () => {
    it("revert if non-owner calls togglePauseState", async () => {
      const { ico, alice } = await loadFixture(setupFixture);

      await expect(ico.connect(alice).togglePauseState()).to.be.revertedWith(
        "Caller is not the owner"
      );
    });

    it("Should toggle pause state when called by owner", async () => {
      const { ico } = await loadFixture(setupFixture);

      expect(await ico.isPaused()).to.be.false;
      await ico.togglePauseState();
      expect(await ico.isPaused()).to.be.true;
      await ico.togglePauseState();
      expect(await ico.isPaused()).to.be.false;
    });

    it("Event 'PauseToggled' should be emitted when pause state is toggled", async () => {
      const { ico } = await loadFixture(setupFixture);

      await expect(ico.togglePauseState()).to.emit(ico, "PauseToggled");
    });
  });

  describe("Contribute", () => {
    it("Revert if ICO is paused", async () => {
      const { ico, alice } = await loadFixture(setupFixture);

      await ico.togglePauseState();
      await expect(ico.connect(alice).contribute()).to.be.revertedWith(
        "ICO is paused"
      );
    });

    it("Revert if the contributor is not on the whitelist during Seed Phase", async () => {
      const { ico, hacker } = await loadFixture(setupFixture);

      await expect(ico.connect(hacker).contribute()).to.be.revertedWith(
        "Contributor is not on the whitelist"
      );
    });

    it("Should allow contributors to contribute in the seed phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("10");
      expect(await ico.currentPhase()).to.equal(0);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
    });

    it("Should not allow individual contributions to exceed the max individual limit during Seed Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("1501");
      expect(await ico.currentPhase()).to.equal(0);
      await expect(
        ico.connect(alice).contribute({ value: amount })
      ).to.be.revertedWith("Individual contribution limit met");
    });

    it("Should not allow total contributions to exceed the max total limit during Seed Phase", async () => {
      const { ico } = await loadFixture(setupFixture);
      const signers = await ethers.getSigners();
      const seedLimit = ethers.utils.parseEther("15000");
      let amount = ethers.utils.parseEther("1500");
      expect(await ico.currentPhase()).to.equal(0);
      for (let i = 0; i < 9; i++) {
        const newSigner = signers[i];
        const totalContribution = await ico.totalContributions();
        const totalPlusAmount = totalContribution.add(amount);
        if (totalPlusAmount.gt(seedLimit)) {
          await expect(
            ico
              .connect(signers[i])
              .contribute({ value: ethers.utils.parseEther("1501") })
          ).to.be.revertedWith("Seed phase contribution limit met");
          break;
        }
        await ico.connect(newSigner).contribute({ value: amount });
        expect(await ico.contributions(newSigner.address)).to.equal(amount);
      }
    });

    it("Should not allow total contributions to excee the max total limit during Open Phase", async () => {
      const { ico } = await loadFixture(setupFixture);
      const signers = await ethers.getSigners();
      const openLimit = ethers.utils.parseEther("30000");
      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      let amount = ethers.utils.parseEther("2100");
      for (let i = 0; i < 15; i++) {
        const newSigner = signers[i];
        const totalContribution = await ico.totalContributions();
        const totalPlusAmount = totalContribution.add(amount);
        if (totalPlusAmount.gt(openLimit)) {
          await expect(
            ico.connect(signers[i]).contribute({ value: amount })
          ).to.be.revertedWith("Total ICO contribution limit met");
          break;
        }
        await ico.connect(newSigner).contribute({ value: amount });
        expect(await ico.contributions(newSigner.address)).to.equal(amount);
      }
    });

    it("Should allow contributions during the General Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("10");
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
    });

    it("Should not let contributors contribute more than the max individual limit during General Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("1001");
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await expect(
        ico.connect(alice).contribute({ value: amount })
      ).to.be.revertedWith("Individual contribution limit met");
    });

    // write a test that checks if the total contributions exceed the max total limit during the General Phase

    it("Should not let Seed contributors that exceeded the General Phase limit contribute during General Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("1000");
      expect(await ico.currentPhase()).to.equal(0);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await expect(
        ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Individual contribution limit met");
    });

    it("Should let contributors contribute during the Open Phase without an individual limit", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("2000");
      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
    });

    it("Should let Seed contributors who met the limit contribute during the Open Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("1500");
      expect(await ico.currentPhase()).to.equal(0);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
      await expect(
        ico.connect(alice).contribute({ value: amount })
      ).to.be.revertedWith("Individual contribution limit met");
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await expect(
        ico.connect(alice).contribute({ value: amount })
      ).to.be.revertedWith("Individual contribution limit met");
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(
        ethers.utils.parseEther("3000")
      );
      expect(await ico.totalContributions()).to.equal(
        ethers.utils.parseEther("3000")
      );
    });

    it("Revert if the ICO contribution has been met during the open phase", async () => {
      const { ico } = await loadFixture(setupFixture);
      const signers = await ethers.getSigners();
      const amount = ethers.utils.parseEther("6000");
      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      for (let i = 0; i < 5; i++) {
        await ico.connect(signers[i]).contribute({ value: amount });
        expect(await ico.contributions(signers[i].address)).to.equal(amount);
        const total = ethers.utils.parseEther(`${6000 * (i + 1)}`);
        expect(await ico.totalContributions()).to.equal(total);
      }
      await expect(
        ico
          .connect(signers[5])
          .contribute({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Total ICO contribution limit met");
    });

    it("Emits a Contribution event when a contributor contributes", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("10");
      await expect(ico.connect(alice).contribute({ value: amount }))
        .to.emit(ico, "ContributionMade")
        .withArgs(alice.address, amount);
    });
  });

  describe("RedeemSPC", () => {
    it("Revert if ICO is in Seed Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      expect(await ico.currentPhase()).to.equal(0);
      await expect(ico.connect(alice).redeemSPC()).to.be.revertedWith(
        "ICO not yet in the open phase, redemption not possible"
      );
    });

    it("Revert if ICO is in General Phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);
      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(1);
      await expect(ico.connect(alice).redeemSPC()).to.be.revertedWith(
        "ICO not yet in the open phase, redemption not possible"
      );
    });

    it("Should allow contributers to redeem SPC tokens in Open Phase", async () => {
      const { ico, alice, spaceCoin } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("10");
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      await ico.connect(alice).redeemSPC();
      expect(await spaceCoin.balanceOf(alice.address)).to.equal(amount.mul(5));
    });

    it("Should not allow users to redeem aditional SPC tokens after they have already redeemed", async () => {
      const { ico, alice, spaceCoin } = await loadFixture(setupFixture);
      const amount = ethers.utils.parseEther("10");
      await ico.connect(alice).contribute({ value: amount });
      expect(await ico.contributions(alice.address)).to.equal(amount);
      expect(await ico.totalContributions()).to.equal(amount);
      expect(await ico.currentPhase()).to.equal(0);
      await ico.advanceICOPhase();
      await ico.advanceICOPhase();
      expect(await ico.currentPhase()).to.equal(2);
      await ico.connect(alice).redeemSPC();
      expect(await spaceCoin.balanceOf(alice.address)).to.equal(amount.mul(5));
      await expect(ico.connect(alice).redeemSPC()).to.be.revertedWith(
        "Contributor has no contributions to redeem"
      );
    });
  });
});
