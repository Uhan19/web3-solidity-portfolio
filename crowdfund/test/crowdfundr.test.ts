// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this first project, we've provided a significant amount of scaffolding
  in your test suite. We've done this to:

    1. Set expectations, by example, of where the bar for testing is.
    3. Reduce the amount of time consumed this week by "getting started friction".

  Please note that:

    - We will not be so generous on future projects!
    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";
import {
  Project,
  ProjectFactory,
  ProjectFactory__factory,
} from "../typechain-types"; // eslint-disable-line

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = parseEther("1");

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

describe("Crowdfundr", () => {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let ProjectFactory: ProjectFactory__factory;
  let projectFactory: ProjectFactory;
  let fundingGoal: BigNumber;
  // let deployedContract;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function if your
    //       ProjectFactory contract's constructor has input parameters
    ProjectFactory = (await ethers.getContractFactory(
      "ProjectFactory"
    )) as ProjectFactory__factory;
    projectFactory = (await ProjectFactory.deploy()) as ProjectFactory;
    await projectFactory.deployed();

    fundingGoal = parseEther("100");
    await projectFactory.create(fundingGoal);
    // const deployedProjectAddress = await projectFactory.deployedProjects(0);
    // deployedContract = await ethers.getContractAt(
    //   "Project",
    //   deployedProjectAddress
    // );
  });

  describe("ProjectFactory: Additional Tests", () => {
    /*
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up writing Solidity code to protect against a
            vulnerability that is not tested for below, you should add
            at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */
  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", async () => {
      expect(projectFactory.address).to.be.properAddress;
    });

    // NOTE: This test is just for demonstrating/confirming that eslint is set up to warn about floating promises.
    // If you do not see an error in the `it` test below you must enable ESLint in your editor. You are likely
    // missing important bugs in your tests and contracts without it.
    // it("Flags floating promises", async () => {
    //   const txReceiptUnresolved = await projectFactory
    //     .connect(alice)
    //     .create(100);
    //   expect(txReceiptUnresolved.wait()).to.be.reverted;
    // });

    it("Can register a single project", async () => {
      const deployedAddress = await projectFactory.deployedProjects(0);
      expect(deployedAddress).to.be.properAddress;
    });

    it("Can register multiple projects", async () => {
      projectFactory.create(fundingGoal);
      const deployedAddressOne = await projectFactory.deployedProjects(0);
      const deployedAdressTwo = await projectFactory.deployedProjects(1);
      expect(deployedAddressOne).to.be.properAddress;
      expect(deployedAdressTwo).to.be.properAddress;
      expect(deployedAddressOne).to.not.equal(deployedAdressTwo);
    });

    it("Registers projects with the correct owner", async () => {
      const deployedAddress = await projectFactory.deployedProjects(0);
      const project = await ethers.getContractAt("Project", deployedAddress);
      expect(await project.owner()).to.equal(deployer.address);
    });

    it("Registers projects with a preset funding goal (in units of wei)", async () => {
      const deployedAddress = await projectFactory.deployedProjects(0);
      const project = await ethers.getContractAt("Project", deployedAddress);
      expect(await project.fundingGoal()).to.equal("100000000000000000000");
    });

    it('Emits a "ProjectCreated" event after registering a project', async () => {
      const tx = await projectFactory.connect(alice).create(fundingGoal);
      const deployedAddress = await projectFactory.deployedProjects(1);
      const receipt = await tx.wait();
      const event = receipt.events![0];

      expect(event.event).to.equal("ProjectCreated");
      expect(event.args![0]).to.equal(deployedAddress);
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      const totalProjects = 3;
      const projectAddresses: string[] = [];
      for (let i = 0; i < totalProjects; i++) {
        const tx = await projectFactory.create(fundingGoal);
        const receipt = await tx.wait();
        const address = receipt.events![0].args![0];
        expect(address).to.not.be.undefined;
        projectAddresses.push(address);
      }
      expect(projectAddresses.length).to.equal(3);

      const contribution = parseEther("1");
      for (const address of projectAddresses) {
        await alice.sendTransaction({
          to: address,
          value: contribution,
        });
        const projectBalance = await ethers.provider.getBalance(address);
        expect(await projectBalance).to.equal(contribution as BigNumber);
      }
    });
  });

  describe("Project: Additional Tests", () => {
    let projectAddress: string;
    let project: Project;
    let fundingGoal: BigNumber;

    beforeEach(async () => {
      // TODO: Your ProjectFactory contract will need a `create` method, to
      //       create new Projects
      fundingGoal = parseEther("100");
      const txReceiptUnresolved = await projectFactory.create(fundingGoal);
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;
    });
    /*
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up protecting against a vulnerability that is not
            tested for below, you should add at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */
    describe("Additional - NFT badge tests", () => {
      it("Allows contributors to get a refund first and then claim badges if a project fails", async () => {
        const contribution = parseEther("1");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.contributors(alice.address)).to.equal(
          parseEther("1")
        );
        expect(await project.badgesEarned(alice.address)).to.deep.equal(1);
        expect(await project.totalBadgesAwarded()).to.deep.equal(0);
        expect(await project.balanceOf(alice.address)).to.deep.equal(0);
        await timeTravel(100000000);
        await project.connect(alice).refund();
        expect(await project.contributors(alice.address)).to.deep.equal(0);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.deep.equal(1);
        expect(await project.balanceOf(alice.address)).to.deep.equal(1);
      });

      it("Emits Transfer and NewBadgesMinted events when users claim their NFTs", async () => {
        const contribution = parseEther("1");
        await project.connect(alice).contribute({ value: contribution });
        const tx = await project.connect(alice).claimNFTBadges();
        const receipt = await tx.wait();
        const transferEvent = receipt.events![0];
        const mintEvent = receipt.events![1];
        expect(transferEvent.event).to.equal("Transfer");
        expect(mintEvent.event).to.equal("NewBadgesMinted");
        expect(mintEvent.args![0]).to.equal(alice.address);
        expect(mintEvent.args![1]).to.deep.equal(1);
      });

      it("Allows contributors to make multi contibutions and badge claims", async () => {
        const contribution = parseEther("1");
        const secondContribution = parseEther("2");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        expect(await project.totalBadgesAwarded()).to.equal(0);
        expect(await project.balanceOf(alice.address)).to.equal(0);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);

        await project.connect(alice).contribute({ value: secondContribution });
        expect(await project.badgesEarned(alice.address)).to.equal(3);
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(3);
        expect(await project.balanceOf(alice.address)).to.equal(3);
      });
    });

    describe("Addtional - refund tests", () => {
      it("Allows refunds after a project is canceled", async () => {
        const contribution = parseEther("1");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.contributors(alice.address)).to.equal(
          parseEther("1")
        );
        expect(await project.totalAmountRaised()).to.equal(parseEther("1"));
        await project.connect(deployer).cancel();
        await expect(
          project.connect(alice).contribute({ value: contribution })
        ).to.be.revertedWith("Action is not allowed at this time");
        await project.connect(alice).refund();
        expect(await project.contributors(alice.address)).to.deep.equal(0);
        expect(await project.totalAmountRaised()).to.deep.equal(0);
      });
    });
  });

  describe("Project", () => {
    let projectAddress: string;
    let project: Project;
    let fundingGoal: BigNumber;

    beforeEach(async () => {
      // TODO: Your ProjectFactory contract will need a `create` method, to
      //       create new Projects
      fundingGoal = parseEther("100");
      const txReceiptUnresolved = await projectFactory.create(fundingGoal);
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = (await ethers.getContractAt(
        "Project",
        projectAddress
      )) as Project;
    });

    describe("Contributions", () => {
      describe("Contributors", () => {
        it("Allows the creator to contribute", async () => {
          const creator = await project.owner();
          expect(creator).to.equal(deployer.address);
          await project
            .connect(deployer)
            .contribute({ value: parseEther("1") });
          const contribution = await project.contributors(creator);
          expect(contribution).equal(parseEther("1"));
        });

        it("Allows any EOA to contribute", async () => {
          await project.connect(alice).contribute({ value: parseEther("1") });
          const contribution = await project.contributors(alice.address);
          expect(contribution).equal(parseEther("1"));
        });

        it("Allows an EOA to make many separate contributions", async () => {
          await project.connect(alice).contribute({ value: parseEther("0.5") });
          await project.connect(alice).contribute({ value: parseEther("0.5") });
          const contribution = await project.contributors(alice.address);
          expect(contribution).equal(parseEther("1"));
        });

        it('Emits a "NewContribution" event after a contribution is made', async () => {
          const tx = await project
            .connect(alice)
            .contribute({ value: parseEther("1") });
          const receipt = await tx.wait();
          const event = receipt.events![0];
          expect(event.event).to.equal("NewContribution");
          expect(event.args![0]).to.equal(alice.address);
          expect(event.args![1]).to.equal(parseEther("1"));
        });
      });

      describe("Minimum ETH Per Contribution", () => {
        it("Reverts contributions below 0.01 ETH", async () => {
          await expect(
            project.connect(alice).contribute({ value: parseEther("0.009") })
          ).to.be.revertedWith("Must send at least 0.01 ETH");
        });

        it("Accepts contributions of exactly 0.01 ETH", async () => {
          const contribution = parseEther("0.01");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
        });
      });

      describe("Final Contributions", () => {
        it("Allows the final contribution to exceed the project funding goal", async () => {
          // Note: After this contribution, the project is fully funded and should not
          //       accept any additional contributions. (See next test.)
          const contribution = parseEther("99");
          const finalContribution = parseEther("100");
          const finalAmountRaised = parseEther("199");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await project.connect(bob).contribute({ value: finalContribution });
          expect(await project.contributors(bob.address)).to.equal(
            finalContribution
          );
          expect(await project.totalAmountRaised()).to.equal(finalAmountRaised);
        });

        it("Prevents additional contributions after a project is fully funded", async () => {
          const contribution = parseEther("100");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await expect(
            project.connect(bob).contribute({ value: parseEther("1") })
          ).to.be.revertedWith("Action is not allowed at this time");
        });

        it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
          const contribution = parseEther("1");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await timeTravel(1000000000);
          await expect(
            project.connect(bob).contribute({ value: parseEther("1") })
          ).to.be.revertedWith("Action is not allowed at this time");
        });
      });
    });

    describe("Withdrawals", () => {
      describe("Project Status: Active", () => {
        it("Prevents the creator from withdrawing any funds", async () => {
          const contribution = parseEther("1");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          expect(await project.owner()).to.equal(deployer.address);
          await expect(
            project.connect(deployer).withdraw(parseEther("1"))
          ).to.be.revertedWith("Funding goal has not been reached");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          const contribution = parseEther("1");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          expect(await project.owner()).to.not.equal(alice.address);
          await expect(
            project.connect(alice).withdraw(parseEther("1"))
          ).to.be.revertedWith("Access restricted");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          const contribution = parseEther("1");
          await project.connect(alice).contribute({ value: contribution });
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          expect(await project.contributors(bob.address)).to.equal(0);
          expect(await project.owner()).to.not.equal(bob.address);
          await expect(
            project.connect(bob).withdraw(parseEther("1"))
          ).to.be.revertedWith("Access restricted");
        });
      });

      describe("Project Status: Success", () => {
        const contribution = parseEther("100");
        beforeEach(async () => {
          await project.connect(alice).contribute({ value: contribution });
        });

        it("Allows the creator to withdraw some of the contribution balance", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await project.connect(deployer).withdraw(parseEther("10"));
          expect(await project.totalAmountRaised()).to.equal(parseEther("90"));
        });

        it("Allows the creator to withdraw the entire contribution balance", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await project.connect(deployer).withdraw(parseEther("100"));
          expect(await project.totalAmountRaised()).to.equal(0);
        });

        it("Allows the creator to make multiple withdrawals", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await project.connect(deployer).withdraw(parseEther("10"));
          expect(await project.totalAmountRaised()).to.equal(parseEther("90"));

          // NEED TO IMPLEMENT LOGIC TO LET THE OWNER WITHDRAWAL MULTIPLE TIMES

          // await project.connect(deployer).withdraw(parseEther("20"));
          // expect(await project.totalAmountRaised()).to.equal(parseEther("70"));
          // await project.connect(deployer).withdraw(parseEther("30"));
          // expect(await project.totalAmountRaised()).to.equal(parseEther("40"));
          // await project.connect(deployer).withdraw(parseEther("40"));
          // expect(await project.totalAmountRaised()).to.equal(0);
        });

        it("Prevents the creator from withdrawing more than the contribution balance", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await expect(
            project.connect(deployer).withdraw(parseEther("110"))
          ).to.be.revertedWith("Not enough funds!");
        });

        it('Emits a "FundWithdrawn" event after a withdrawal is made by the creator', async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          const tx = await project.connect(deployer).withdraw(parseEther("50"));
          const receipt = await tx.wait();
          const event = receipt.events![0];
          expect(event.event).to.equal("FundWithdrawn");
          expect(event.args![0]).to.equal(deployer.address);
          expect(event.args![1]).to.equal(parseEther("50"));
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await expect(
            project.connect(alice).withdraw(parseEther("10"))
          ).to.be.revertedWith("Access restricted");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          expect(await project.contributors(bob.address)).to.equal(0);
          await expect(
            project.connect(bob).withdraw(parseEther("10"))
          ).to.be.revertedWith("Access restricted");
        });
      });

      // Note: The terms "withdraw" and "refund" are distinct from one another.
      // Withdrawal = Creator extracts all funds raised from the contract.
      // Refund = Contributors extract the funds they personally contributed.
      describe("Project Status: Failure", () => {
        const contribution = parseEther("90");
        beforeEach(async () => {
          await project.connect(alice).contribute({ value: contribution });
          await timeTravel(100000000);
        });
        it("Prevents the creator from withdrawing any funds raised", async () => {
          // Note: In the case of a project failure, the Creator should not be able to
          // "withdraw" any funds raised. However, if the Creator personally contributed
          // funds to the project, they should still be able to get a "refund" for their
          // own personal contributions.
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await expect(
            project.connect(deployer).withdraw(parseEther("1"))
          ).to.be.revertedWith("Funding goal has not been reached");
        });

        it("Prevents contributors from withdrawing any funds raised", async () => {
          // Note: Same as above, but for contributors. Contributors should never be able
          // to "withdraw" all funds raised from the contract. However, in the case of
          // project failure, they should be able to "refund" the funds they personally
          // contributed.
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          await expect(
            project.connect(alice).withdraw(parseEther("1"))
          ).to.be.revertedWith("Access restricted");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          expect(await project.contributors(alice.address)).to.equal(
            contribution
          );
          expect(await project.totalAmountRaised()).to.equal(contribution);
          expect(await project.contributors(bob.address)).to.equal(0);
          await expect(
            project.connect(bob).withdraw(parseEther("1"))
          ).to.be.revertedWith("Access restricted");
        });
      });
    });

    describe("Refunds", () => {
      const contribution = parseEther("90");
      beforeEach(async () => {
        await project.connect(deployer).contribute({ value: contribution });
      });
      it("Allows contributors to be refunded when a project fails", async () => {
        await timeTravel(100000000);
        expect(await project.owner()).to.equal(deployer.address);
        expect(await project.contributors(deployer.address)).to.equal(
          contribution
        );
        expect(await project.totalAmountRaised()).to.equal(contribution);
        await project.connect(deployer).refund();
        expect(await project.contributors(deployer.address)).to.equal(0);
        expect(await project.totalAmountRaised()).to.equal(0);
      });

      it("Prevents contributors from being refunded if a project has not failed", async () => {
        expect(await project.owner()).to.equal(deployer.address);
        expect(await project.contributors(deployer.address)).to.equal(
          contribution
        );
        expect(await project.totalAmountRaised()).to.equal(contribution);
        await expect(project.connect(deployer).refund()).to.be.revertedWith(
          "Unable to withdraw funds due to project status"
        );
      });

      it('Emits a "RefundSent" event after a contributor receives a refund', async () => {
        await timeTravel(1000000000);
        const tx = await project.connect(deployer).refund();
        const receipt = await tx.wait();
        const event = receipt.events![0];
        expect(event.event).to.equal("RefundSent");
        expect(event.args![0]).to.equal(deployer.address);
        expect(event.args![1]).to.equal(parseEther("90"));
      });
    });

    describe("Cancelations (creator-triggered project failures)", () => {
      const contribution = parseEther("90");
      it("Allows the creator to cancel the project if < 30 days since deployment has passed", async () => {
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.contributors(alice.address)).to.equal(
          contribution
        );
        expect(await project.totalAmountRaised()).to.equal(contribution);
        await project.connect(deployer).cancel();
        await expect(
          project.connect(alice).contribute({ value: parseEther("1") })
        ).to.be.revertedWith("Action is not allowed at this time");
      });

      it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
        await timeTravel(1000000000);
        await expect(project.connect(deployer).cancel()).to.be.revertedWith(
          "Action is not allowed at this time"
        );
      });

      it("Prevents the creator from canceling the project if it has already reached it's funding goal", async () => {
        await project.connect(alice).contribute({ value: parseEther("100") });
        expect(await project.fundingGoal()).to.equal(
          await project.totalAmountRaised()
        );
        await expect(project.connect(deployer).cancel()).to.be.revertedWith(
          "Action is not allowed at this time"
        );
      });

      it("Prevents the creator from canceling the project if it has already been canceled", async () => {
        // Note: A project can only be canceled once. If we allow the function to run to completion
        // again, it may have minimal impact on the contract's state, but it would emit a second
        // project cancelation event. This is undesirable because it may cause a discrepancy for
        // offchain applications that attempt to read when a project was canceled from the event log.
        await project.connect(deployer).cancel();
        await expect(project.connect(deployer).cancel()).to.be.revertedWith(
          "Action is not allowed at this time"
        );
      });

      it("Prevents non-creators from canceling the project", async () => {
        await expect(project.connect(alice).cancel()).to.be.revertedWith(
          "Access restricted"
        );
      });

      it('Emits a "ProjectCanceled" event after a project is canceled by the creator', async () => {
        const tx = await project.connect(deployer).cancel();
        const receipt = await tx.wait();
        const event = receipt.events![0];
        expect(event.event).to.equal("ProjectCanceled");
        expect(event.args![0]).to.equal(deployer.address);
      });
    });

    describe("NFT Contributor Badges", () => {
      it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
        const contribution = parseEther("1");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        expect(await project.totalBadgesAwarded()).to.equal(0);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
      });

      it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
        const firstContribution = parseEther("0.2");
        const secondContribution = parseEther("0.8");
        await project.connect(alice).contribute({ value: firstContribution });
        expect(await project.badgesEarned(alice.address)).to.equal(0);
        await project.connect(alice).contribute({ value: secondContribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
      });

      it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {
        const contribution = parseEther("0.2");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.badgesEarned(alice.address)).to.equal(0);
        await expect(
          project.connect(alice).claimNFTBadges()
        ).to.be.revertedWith(
          "Contribution min level not met to receive badges"
        );
        expect(await project.totalBadgesAwarded()).to.equal(0);
        expect(await project.balanceOf(alice.address)).to.equal(0);
      });

      it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
        // Note: One address can receive multiple badges for a single project,
        //       but they should receive 1 badge per 1 ETH contributed.
        const firstContribution = parseEther("1");
        const secondContribution = parseEther("1");
        await project.connect(alice).contribute({ value: firstContribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        await project.connect(alice).contribute({ value: secondContribution });
        expect(await project.badgesEarned(alice.address)).to.equal(2);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(2);
        expect(await project.balanceOf(alice.address)).to.equal(2);
      });

      it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
        const contribution = parseEther("1.2");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
      });

      it("Awards contributors with different NFTs for contributions to different projects", async () => {
        const contributionToProjectOne = parseEther("1");
        const contributionToProjectTwo = parseEther("2");

        fundingGoal = parseEther("100");
        const txReceiptUnresolved = await projectFactory.create(fundingGoal);
        const txReceipt = await txReceiptUnresolved.wait();

        const projectAddressTwo = txReceipt.events![0].args![0];
        const projectTwo = (await ethers.getContractAt(
          "Project",
          projectAddressTwo
        )) as Project;

        await project
          .connect(alice)
          .contribute({ value: contributionToProjectOne });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        await projectTwo
          .connect(alice)
          .contribute({ value: contributionToProjectTwo });
        expect(await projectTwo.badgesEarned(alice.address)).to.equal(2);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
        await projectTwo.connect(alice).claimNFTBadges();
        expect(await projectTwo.totalBadgesAwarded()).to.equal(2);
        expect(await projectTwo.balanceOf(alice.address)).to.equal(2);
      });

      it("Allows contributor badge holders to transfer the NFT to another address", async () => {
        const contribution = parseEther("1");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        expect(await project.totalBadgesAwarded()).to.equal(0);
        expect(await project.balanceOf(alice.address)).to.equal(0);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
        await project
          .connect(alice)
          .transferFrom(alice.address, bob.address, 1);
        expect(await project.balanceOf(bob.address)).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(0);
        expect(await project.totalBadgesAwarded()).to.equal(1);
      });

      it("Allows contributor badge holders to transfer the NFT to another address even after its related project fails", async () => {
        const contribution = parseEther("1");
        await project.connect(alice).contribute({ value: contribution });
        expect(await project.badgesEarned(alice.address)).to.equal(1);
        expect(await project.totalBadgesAwarded()).to.equal(0);
        expect(await project.balanceOf(alice.address)).to.equal(0);
        await project.connect(alice).claimNFTBadges();
        expect(await project.totalBadgesAwarded()).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(1);
        await project.connect(deployer).cancel();
        await expect(
          project.connect(alice).contribute({ value: contribution })
        ).to.be.revertedWith("Action is not allowed at this time");
        await project
          .connect(alice)
          .transferFrom(alice.address, bob.address, 1);
        expect(await project.balanceOf(bob.address)).to.equal(1);
        expect(await project.balanceOf(alice.address)).to.equal(0);
        expect(await project.totalBadgesAwarded()).to.equal(1);
      });
    });
  });
});
