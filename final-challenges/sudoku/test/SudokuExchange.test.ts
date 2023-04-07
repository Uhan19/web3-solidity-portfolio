import { assert } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import {
  SudokuChallenge,
  SudokuExchange,
  SudokuExchangeOptimized,
  TestToken,
} from "../typechain-types";

describe("SudokuExchange", function () {
  const setupFixture = async () => {
    const [deployer, alice, bob] = await ethers.getSigners();
    const SudokuExchange = await ethers.getContractFactory("SudokuExchange");
    const sudokuExchange = (await SudokuExchange.deploy()) as SudokuExchange;
    await sudokuExchange.deployed();

    const SudokuExchangeOptimized = await ethers.getContractFactory(
      "SudokuExchangeOptimized"
    );
    const sudokuExchangeOptimized =
      (await SudokuExchangeOptimized.deploy()) as SudokuExchangeOptimized;
    await sudokuExchangeOptimized.deployed();

    const challenge = [
      3, 0, 6, 5, 0, 8, 4, 0, 0, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 8, 7, 0, 0, 0, 0,
      3, 1, 0, 0, 3, 0, 1, 0, 0, 8, 0, 9, 0, 0, 8, 6, 3, 0, 0, 5, 0, 5, 0, 0, 9,
      0, 6, 0, 0, 1, 3, 0, 0, 0, 0, 2, 5, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4, 0, 0, 5,
      2, 0, 6, 3, 0, 0,
    ];

    const SudokuChallenge = await ethers.getContractFactory("SudokuChallenge");
    const sudokuChallenge = (await SudokuChallenge.deploy(
      challenge
    )) as SudokuChallenge;
    await sudokuChallenge.deployed();
    const amount = parseEther("100");
    const TestToken = await ethers.getContractFactory("TestToken");
    const token = (await TestToken.deploy("Test Token", "TST")) as TestToken;
    await token.deployed();

    const [owner] = await ethers.getSigners();
    await token.mint(owner.address, amount);
    await token.approve(sudokuExchange.address, amount);
    await token.approve(sudokuExchangeOptimized.address, amount);

    const correctSolution = [
      3, 1, 6, 5, 7, 8, 4, 9, 2, 5, 2, 9, 1, 3, 4, 7, 6, 8, 4, 8, 7, 6, 2, 9, 5,
      3, 1, 2, 6, 3, 4, 1, 5, 9, 8, 7, 9, 7, 4, 8, 6, 3, 1, 2, 5, 8, 5, 1, 7, 9,
      2, 6, 4, 3, 1, 3, 8, 9, 4, 7, 2, 5, 6, 6, 9, 2, 3, 5, 1, 8, 7, 4, 7, 4, 5,
      2, 8, 6, 3, 1, 9,
    ];

    return {
      deployer,
      alice,
      bob,
      sudokuExchange,
      sudokuExchangeOptimized,
      sudokuChallenge,
      token,
      correctSolution,
    };
  };

  describe("SudokuExchange", function () {
    it.only("Compare gas costs of the two createReward functions", async () => {
      const {
        sudokuExchange,
        sudokuChallenge,
        sudokuExchangeOptimized,
        token,
        deployer,
        correctSolution,
      } = await setupFixture();
      const reward = parseEther("1");
      const challengeReward = {
        challenge: sudokuChallenge.address,
        reward,
        token: token.address,
        solved: false,
      };
      await sudokuExchange.createReward(challengeReward);
      await sudokuExchangeOptimized.createReward(challengeReward);
      await sudokuExchangeOptimized.claimReward(
        challengeReward.challenge,
        correctSolution
      );
      await sudokuExchange.claimReward(
        challengeReward.challenge,
        correctSolution
      );
      console.log(
        "sudokuExchange >>>>>>",
        await sudokuExchange.rewardChallenges(sudokuChallenge.address)
      );
      console.log(
        "sudokuExchangeOptimized >>>>>>",
        await sudokuExchangeOptimized.rewardChallenges(sudokuChallenge.address)
      );
    });

    it("Revert on 0 token address sent in", async () => {
      const { sudokuExchange, sudokuChallenge } = await setupFixture();
      const reward = parseEther("1");
      const challengeReward = {
        challenge: sudokuChallenge.address,
        reward,
        token: "0x00",
        solved: false,
      };
      try {
        await sudokuExchange.createReward(challengeReward);
        assert.fail("The transaction should have thrown an error");
      } catch (err: any) {
        assert.include(
          err.message,
          "invalid address",
          "The error message should contain 'invalid address'"
        );
      }
    });
  });
});
