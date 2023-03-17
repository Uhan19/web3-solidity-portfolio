import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
// import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";
import { Dao, MockNftMarketplace, DaoTest } from "../typechain-types";

type PromiseOrValue<T> = Promise<T> | T;

const ONE_DAY: number = 60 * 60 * 24;
// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number): Promise<number> => {
  return time.increase(seconds);
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const timeTravelTo = async (seconds: number): Promise<void> => {
  return time.increaseTo(seconds);
};

const getCalldata = (
  nftMarketplace: any,
  nftContract: any,
  nftId: any,
  maxPrice: any
) => {
  let funcInterface: any = new ethers.utils.Interface([
    "function buyNFTFromMarketplace(address,address,uint256,uint256)",
  ]);
  funcInterface = funcInterface.encodeFunctionData("buyNFTFromMarketplace", [
    nftMarketplace,
    nftContract,
    nftId,
    maxPrice,
  ]);

  return funcInterface;
};

const getDaoTestCalldata = (a: any, b: any) => {
  let funcInterface: any = new ethers.utils.Interface([
    "function add(uint256,uint256)",
  ]);
  funcInterface = funcInterface.encodeFunctionData("add", [a, b]);

  return funcInterface;
};

describe("Dao", () => {
  const setupFixture = async () => {
    const [
      deployer,
      alice,
      bob,
      target1,
      target2,
      target3,
      target4,
      target5,
      dwight,
      jim,
      michael,
      kevin,
      pam,
    ] = await ethers.getSigners();
    const Dao = await ethers.getContractFactory("Dao");
    const dao: Dao = (await Dao.deploy()) as Dao;
    await dao.deployed();

    const DaoTest = await ethers.getContractFactory("DaoTest");
    const daoTest: DaoTest = (await DaoTest.deploy()) as DaoTest;
    await daoTest.deployed();

    const MockNftMarketplace = await ethers.getContractFactory(
      "MockNftMarketplace"
    );
    const mockNftMarketplace: MockNftMarketplace =
      (await MockNftMarketplace.deploy()) as MockNftMarketplace;
    await mockNftMarketplace.deployed();

    const chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

    const mockCallData: Array<string> = [
      "0x2e1a7d4d",
      "0x7465f5ec",
      "0x2e7e2bac",
      "0x6733d4db",
      "0xec8ac4d7",
    ];

    const domainType = {
      name: await dao.name(),
      chainId,
      verifyingContract: dao.address,
    };

    const ballotType = {
      Ballot: [
        { name: "proposalId", type: "uint256" },
        { name: "support", type: "bool" },
      ],
    };

    const mockValues: Array<BigNumber> = [
      ethers.utils.parseEther("0.01"),
      ethers.utils.parseEther("0.02"),
      ethers.utils.parseEther("0.02"),
      ethers.utils.parseEther("0.01"),
      ethers.utils.parseEther("0.01"),
    ];

    const mockTargetAddresses: Array<string> = [
      target1.address,
      target2.address,
      target3.address,
      target4.address,
      target5.address,
    ];

    return {
      deployer,
      alice,
      bob,
      dwight,
      jim,
      michael,
      kevin,
      pam,
      dao,
      daoTest,
      chainId,
      mockCallData,
      mockTargetAddresses,
      mockNftMarketplace,
      mockValues,
      ballotType,
      domainType,
    };
  };

  describe("Deployment", () => {
    it("Deploys a contract", async () => {
      const { dao, chainId } = await setupFixture();
      expect(dao.address).to.be.properAddress;
    });
  });

  describe("Membership", () => {
    it("Allows members to join for exactly 1 ETH", async () => {
      const { alice, dao } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const aliceMembership = await dao.membership(alice.address);
      expect(aliceMembership.votingPower).to.equal(1);
      expect(await aliceMembership.votingPower).to.equal(1);
      expect(await dao.totalMembers()).to.equal(1);
      expect(await dao.provider.getBalance(dao.address)).to.equal(
        parseEther("1")
      );
    });

    it("Does not allow members to join for less than 1 ETH", async () => {
      const { alice, dao } = await setupFixture();
      await expect(
        dao.connect(alice).buyMembership({ value: parseEther("0.9") })
      ).to.be.revertedWithCustomError(dao, "IncorrectMembershipFee");
    });

    it("Does not allow members to join for more than 1 ETH", async () => {
      const { alice, dao } = await setupFixture();
      await expect(
        dao.connect(alice).buyMembership({ value: parseEther("1.1") })
      ).to.be.revertedWithCustomError(dao, "IncorrectMembershipFee");
    });

    it("Does not allow members to join twice", async () => {
      const { alice, dao } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await expect(
        dao.connect(alice).buyMembership({ value: parseEther("1") })
      ).to.be.revertedWithCustomError(dao, "AlreadyAMember");
    });
  });

  describe("Proposals", () => {
    it("Does not allow non-members to create proposals", async () => {
      const { alice, dao, mockCallData, mockTargetAddresses, mockValues } =
        await setupFixture();
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      ).to.be.revertedWithCustomError(dao, "NotAMember");
    });

    it("Does not allow members to create proposals with mismatching length of targets", async () => {
      const { alice, dao, mockCallData, mockValues } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await expect(
        dao.connect(alice).propose([dao.address], mockValues, mockCallData)
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
    });

    it("Does not allow members to create proposals with mismatching length of values", async () => {
      const { alice, dao, mockTargetAddresses, mockCallData } =
        await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await expect(
        dao.connect(alice).propose(mockTargetAddresses, [], mockCallData)
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
    });

    it("Does not allow members to create proposals with mismatching length of calldata", async () => {
      const { alice, dao, mockTargetAddresses, mockValues } =
        await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await expect(
        dao.connect(alice).propose(mockTargetAddresses, mockValues, [])
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
    });

    it("Does not allow members to create proposals with empty targets", async () => {
      const { alice, dao } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await expect(
        dao.connect(alice).propose([], [], [])
      ).to.be.revertedWithCustomError(dao, "NoActionsProvided");
    });

    it("Allows members to create proposals", async () => {
      const {
        alice,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      const timeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).proposer).to.equal(
        alice.address
      );
      expect((await dao.proposals(proposalId)).startTime).to.equal(timeStamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timeStamp + ONE_DAY * 7
      );
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        1
      );
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      expect((await dao.proposals(proposalId)).againstVotes).to.equal(0);
      expect((await dao.proposals(proposalId)).executed).to.be.false;
    });

    it("Allows members to create proposals to buy NFT", async () => {
      const {
        alice,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        mockNftMarketplace,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses, dao.address],
        [...mockValues, ethers.utils.parseEther("1")],
        [
          ...mockCallData,
          getCalldata(
            mockNftMarketplace.address,
            mockNftMarketplace.address,
            1,
            ethers.utils.parseEther("1")
          ),
        ],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(
            [...mockTargetAddresses, dao.address],
            [...mockValues, ethers.utils.parseEther("1")],
            [
              ...mockCallData,
              getCalldata(
                mockNftMarketplace.address,
                mockNftMarketplace.address,
                1,
                ethers.utils.parseEther("1")
              ),
            ]
          )
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).proposer).to.equal(
        alice.address
      );
    });
  });
  describe("Voting", () => {
    it("Does not allow non-members to vote", async () => {
      const {
        alice,
        dao,
        bob,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "NotAMember");
    });

    it("Allows member to vote directly on proposal - forVotes", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(2);
    });

    it("Allows member to vote directly on proposal - against", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).againstVotes).to.equal(0);
      expect(await dao.connect(alice).vote(proposalId, false))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, false, 1);
      expect((await dao.proposals(proposalId)).againstVotes).to.equal(1);
      expect(await dao.connect(bob).vote(proposalId, false))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, false, 1);
      expect((await dao.proposals(proposalId)).againstVotes).to.equal(2);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
    });

    it("Does not allow member who joined after the proposal to vote", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      expect(await dao.totalMembers()).to.equal(1);
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      expect(await dao.totalMembers()).to.equal(2);
      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "NotAMemberAtTimeOfProposal");
    });

    it("Does not allow member to vote twice", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      await expect(
        dao.connect(alice).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "AlreadyVoted");
    });

    it("Does not allow voters to vote twice agnostic of voting methods", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      const votingData = {
        proposalId,
        support: true,
      };
      const aliceSignature = await alice._signTypedData(
        domainType,
        ballotType,
        votingData
      );
      const splitSignature = ethers.utils.splitSignature(aliceSignature);
      const { v, r, s } = splitSignature;
      await expect(dao.castVoteBySignature(proposalId, true, v, r, s))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      await expect(
        dao.castVoteBySignature(proposalId, true, v, r, s)
      ).to.be.revertedWithCustomError(dao, "AlreadyVoted");
      await expect(
        dao.connect(alice).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "AlreadyVoted");
    });

    it("Does not allow member to vote beyound the voting period", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      const timeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      timeTravelTo(timeStamp + ONE_DAY * 7);
      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "ProposalNotActive");
    });

    it("Does not allow member to vote on invalid proposalId", async () => {
      const {
        alice,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const fakeProposalId = "1234567";
      await expect(
        dao.connect(alice).vote(fakeProposalId, true)
      ).to.be.revertedWithCustomError(dao, "InvalidProposalId");
    });

    it("Allows member to vote off-chain using signatures - forVotes", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      const votingData = {
        proposalId,
        support: true,
      };
      const aliceSignature = await alice._signTypedData(
        domainType,
        ballotType,
        votingData
      );
      const splitSignature = ethers.utils.splitSignature(aliceSignature);
      const { v, r, s } = splitSignature;
      await expect(dao.castVoteBySignature(proposalId, true, v, r, s))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
    });

    it("Allows non-members to cast votes for members", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      expect((await dao.membership(alice.address)).votingPower).to.equal(1);
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      const votingData = {
        proposalId,
        support: true,
      };
      const aliceSignature = await alice._signTypedData(
        domainType,
        ballotType,
        votingData
      );
      const splitSignature = ethers.utils.splitSignature(aliceSignature);
      const { v, r, s } = splitSignature;
      expect((await dao.membership(bob.address)).votingPower).to.equal(0);
      await expect(
        dao.connect(bob).castVoteBySignature(proposalId, true, v, r, s)
      )
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
    });

    it("Allows member to vote off-chain using signatures - againstVotes", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      expect((await dao.membership(alice.address)).votingPower).to.equal(1);
      const votingData = {
        proposalId,
        support: false,
      };
      const aliceSignature = await alice._signTypedData(
        domainType,
        ballotType,
        votingData
      );
      const splitSignature = ethers.utils.splitSignature(aliceSignature);
      const { v, r, s } = splitSignature;
      await expect(dao.castVoteBySignature(proposalId, false, v, r, s))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, false, 1);
    });

    it("Does not allow member to vote off-chain using signatures if not a member", async () => {
      const {
        alice,
        bob,
        dao,
        dwight,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      const votingData = {
        proposalId,
        support: true,
      };
      const dwightSignature = await dwight._signTypedData(
        domainType,
        ballotType,
        votingData
      );
      const splitSignature = ethers.utils.splitSignature(dwightSignature);
      const { v, r, s } = splitSignature;
      await expect(
        dao.castVoteBySignature(proposalId, true, v, r, s)
      ).to.be.revertedWithCustomError(dao, "NotAMember");
    });

    it("Allows bulk voting off-chain using signatures", async () => {
      const {
        alice,
        bob,
        dao,
        dwight,
        jim,
        michael,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, nonce);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        5
      );
      const aliceVotingData = {
        proposalId,
        support: true,
      };
      const bobVotingData = {
        proposalId,
        support: true,
      };
      const dwightVotingData = {
        proposalId,
        support: true,
      };
      const michaelVotingData = {
        proposalId,
        support: true,
      };
      const jimVotingData = {
        proposalId,
        support: true,
      };
      const aliceSignature = await alice._signTypedData(
        domainType,
        ballotType,
        aliceVotingData
      );
      const bobSignature = await bob._signTypedData(
        domainType,
        ballotType,
        bobVotingData
      );
      const dwightSignature = await dwight._signTypedData(
        domainType,
        ballotType,
        dwightVotingData
      );
      const michaelSignature = await michael._signTypedData(
        domainType,
        ballotType,
        michaelVotingData
      );
      const jimSignature = await jim._signTypedData(
        domainType,
        ballotType,
        jimVotingData
      );
      const aliceSplitSignature = ethers.utils.splitSignature(aliceSignature);
      const bobSplitSignature = ethers.utils.splitSignature(bobSignature);
      const dwightSplitSignature = ethers.utils.splitSignature(dwightSignature);
      const michaelSplitSignature =
        ethers.utils.splitSignature(michaelSignature);
      const jimSplitSignature = ethers.utils.splitSignature(jimSignature);
      const vList = [
        aliceSplitSignature.v,
        bobSplitSignature.v,
        dwightSplitSignature.v,
        michaelSplitSignature.v,
        jimSplitSignature.v,
      ];
      const rList = [
        aliceSplitSignature.r,
        bobSplitSignature.r,
        dwightSplitSignature.r,
        michaelSplitSignature.r,
        jimSplitSignature.r,
      ];
      const sList = [
        aliceSplitSignature.s,
        bobSplitSignature.s,
        dwightSplitSignature.s,
        michaelSplitSignature.s,
        jimSplitSignature.s,
      ];
      const proposalIdList = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportList = [true, true, true, true, true];
      expect(
        await dao.castBulkVotesBySignature(
          proposalIdList,
          supportList,
          vList,
          rList,
          sList
        )
      ).to.be.ok;
    });

    it("Does not allow bulk voting if target length has mismatch", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
        domainType,
        ballotType,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, nonce);
      expect(await dao.totalProposals()).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(0);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        2
      );
      const aliceVotingData = {
        proposalId,
        support: true,
      };
      const bobVotingData = {
        proposalId,
        support: true,
      };
      const aliceSignature = await alice._signTypedData(
        domainType,
        ballotType,
        aliceVotingData
      );
      const bobSignature = await bob._signTypedData(
        domainType,
        ballotType,
        bobVotingData
      );
      const aliceSplitSignature = ethers.utils.splitSignature(aliceSignature);
      const bobSplitSignature = ethers.utils.splitSignature(bobSignature);
      const vList = [aliceSplitSignature.v, bobSplitSignature.v];
      const vListMismatch = [aliceSplitSignature.v];
      const rList = [aliceSplitSignature.r, bobSplitSignature.r];
      const rListMismatch = [aliceSplitSignature.r];
      const sList = [aliceSplitSignature.s, bobSplitSignature.s];
      const sListMismatch = [aliceSplitSignature.s];
      const proposalIdList = [proposalId, proposalId];
      const proposalIdListMismatch = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const proposalIdEmpty: PromiseOrValue<BigNumberish>[] = [];
      const supportList = [true, true];
      const supportListMismatch = [true, true, true, true, true];
      await expect(
        dao.castBulkVotesBySignature(
          proposalIdListMismatch,
          supportList,
          vList,
          rList,
          sList
        )
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");

      await expect(
        dao.castBulkVotesBySignature(
          proposalIdEmpty,
          supportList,
          vList,
          rList,
          sList
        )
      ).to.be.revertedWithCustomError(dao, "NoActionsProvided");

      await expect(
        dao.castBulkVotesBySignature(
          proposalIdList,
          supportList,
          vListMismatch,
          rList,
          sList
        )
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
      await expect(
        dao.castBulkVotesBySignature(
          proposalIdList,
          supportList,
          vList,
          rListMismatch,
          sList
        )
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
      await expect(
        dao.castBulkVotesBySignature(
          proposalIdList,
          supportList,
          vList,
          rList,
          sListMismatch
        )
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
      await expect(
        dao.castBulkVotesBySignature(
          proposalIdList,
          supportListMismatch,
          vList,
          rList,
          sList
        )
      ).to.be.revertedWithCustomError(dao, "ProposalFuncInformationMisMatch");
    });
  });

  describe("Execute Proposal", () => {
    it("Allows member to execute proposal if quorum is met", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses],
        [...mockValues],
        [...mockCallData],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([...mockTargetAddresses], [...mockValues], [...mockCallData])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        2
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(
        await dao
          .connect(alice)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      )
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId, alice.address);
    });

    it("Allows non-member to execute proposal if quorum is met", async () => {
      const {
        alice,
        bob,
        dwight,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses],
        [...mockValues],
        [...mockCallData],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([...mockTargetAddresses], [...mockValues], [...mockCallData])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        2
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(
        await dao
          .connect(dwight)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      )
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId, dwight.address);
    });

    it("Cannot execute proposal if quorum is not met", async () => {
      const {
        alice,
        bob,
        dwight,
        jim,
        michael,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses],
        [...mockValues],
        [...mockCallData],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([...mockTargetAddresses], [...mockValues], [...mockCallData])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        5
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      await expect(
        dao
          .connect(alice)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      ).to.be.revertedWithCustomError(dao, "ProposalNotSucceeded");
    });

    it("proposal cannot be executed if quorum is met but voting period is not over", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses],
        [...mockValues],
        [...mockCallData],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([...mockTargetAddresses], [...mockValues], [...mockCallData])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        2
      );
      timeTravel(ONE_DAY);
      await expect(
        dao
          .connect(alice)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      ).to.be.revertedWithCustomError(dao, "ProposalNotSucceeded");
    });

    it("proposal cannot be executed if quorum is met but the proposal is defeated", async () => {
      const {
        alice,
        bob,
        jim,
        dwight,
        michael,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, false))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, false, 1);
      expect(await dao.connect(dwight).vote(proposalId, false))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, false, 1);
      expect(await dao.connect(jim).vote(proposalId, false))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, false, 1);
      expect(await dao.connect(michael).vote(proposalId, false))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, false, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).againstVotes).to.equal(4);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(5);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        5
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      await expect(
        dao
          .connect(alice)
          .execute(proposalId, mockTargetAddresses, mockValues, mockCallData, 1)
      ).to.be.revertedWithCustomError(dao, "ProposalNotSucceeded");
    });

    it("cannot execute an invalid proposalId", async () => {
      const {
        alice,
        bob,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses],
        [...mockValues],
        [...mockCallData],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([...mockTargetAddresses], [...mockValues], [...mockCallData])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        2
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      const fakeProposalId = "1234567";
      await expect(
        dao
          .connect(alice)
          .execute(
            fakeProposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      ).to.be.revertedWithCustomError(dao, "InvalidProposalId");
    });

    it("proposal execute will allocate reward for the executor", async () => {
      const {
        alice,
        bob,
        jim,
        dwight,
        michael,
        pam,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        [...mockTargetAddresses],
        [...mockValues],
        [...mockCallData],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([...mockTargetAddresses], [...mockValues], [...mockCallData])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(
        await dao
          .connect(dwight)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      )
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId, dwight.address);
      expect(await dao.rewards(dwight.address)).to.equal(
        ethers.utils.parseEther("0.01")
      );
      expect(await dao.connect(dwight).redeemReward())
        .to.emit(dao, "RewardRedeemed")
        .withArgs(dwight.address, ethers.utils.parseEther("0.01"));
    });

    it("Does not allow executes when the total values are greater than contract balance", async () => {
      const {
        alice,
        bob,
        jim,
        dwight,
        michael,
        pam,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const largeValues: Array<BigNumber> = [
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10"),
      ];
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        largeValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, largeValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      await expect(
        dao
          .connect(dwight)
          .execute(
            proposalId,
            mockTargetAddresses,
            largeValues,
            mockCallData,
            1
          )
      ).to.be.revertedWithCustomError(dao, "InsufficientBalance");
      expect(await dao.rewards(dwight.address)).to.equal(0);
    });

    it("Does not allow members to redeem rewards when the contract balance is less than 5 ether", async () => {
      const {
        alice,
        dwight,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        1
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(
        await dao
          .connect(dwight)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      )
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId, dwight.address);
      expect(await dao.rewards(dwight.address)).to.equal(
        ethers.utils.parseEther("0.01")
      );
      await expect(
        dao.connect(dwight).redeemReward()
      ).to.be.revertedWithCustomError(dao, "InsufficientBalance");
    });

    it("Does not allow members with no rewards to redeem rewards", async () => {
      const {
        alice,
        dwight,
        dao,
        daoTest,
        mockCallData,
        mockTargetAddresses,
        mockValues,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const proposalId = await daoTest.hashProposal(
        mockTargetAddresses,
        mockValues,
        mockCallData,
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose(mockTargetAddresses, mockValues, mockCallData)
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(1);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(1);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        1
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(
        await dao
          .connect(dwight)
          .execute(
            proposalId,
            [...mockTargetAddresses],
            [...mockValues],
            [...mockCallData],
            1
          )
      )
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId, dwight.address);
      expect(await dao.rewards(dwight.address)).to.equal(
        ethers.utils.parseEther("0.01")
      );
      await expect(
        dao.connect(alice).redeemReward()
      ).to.be.revertedWithCustomError(dao, "NoReward");
    });
  });

  describe("Buy NFT", () => {
    it("Allow members to propose a proposal to buy NFT", async () => {
      const {
        alice,
        bob,
        dao,
        dwight,
        michael,
        jim,
        pam,
        daoTest,
        mockNftMarketplace,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const buyNFTCalldata = getCalldata(
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        1,
        ethers.utils.parseEther("1")
      );

      const proposalId = await daoTest.hashProposal(
        [dao.address],
        [0],
        [buyNFTCalldata],
        nonce
      );
      await expect(
        dao.connect(alice).propose([dao.address], [0], [buyNFTCalldata])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(
        await dao
          .connect(bob)
          .execute(proposalId, [dao.address], [0], [buyNFTCalldata], 1)
      ).to.emit(dao, "ProposalExecuted");
      expect(await mockNftMarketplace.balanceOf(dao.address)).to.equal(1);
    });

    it("Revert the whole transaction if external calls fail", async () => {
      const {
        alice,
        bob,
        dao,
        dwight,
        michael,
        jim,
        pam,
        daoTest,
        mockNftMarketplace,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const buyNFTCalldata = getCalldata(
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        11,
        ethers.utils.parseEther("10")
      );

      const proposalId = await daoTest.hashProposal(
        [dao.address],
        [0],
        [buyNFTCalldata],
        nonce
      );
      await expect(
        dao.connect(alice).propose([dao.address], [0], [buyNFTCalldata])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      await expect(
        dao
          .connect(bob)
          .execute(proposalId, [dao.address], [0], [buyNFTCalldata], 1)
      ).to.be.revertedWithCustomError(dao, "ProposalExecutionFailed");
      expect(await mockNftMarketplace.balanceOf(dao.address)).to.equal(0);
    });

    it("Revert if the calldata is incorrect", async () => {
      const { alice, bob, dao, dwight, michael, jim, pam, daoTest } =
        await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const incorrectCalldata = getCalldata(
        jim.address,
        jim.address,
        1,
        ethers.utils.parseEther("1")
      );

      const proposalId = await daoTest.hashProposal(
        [dao.address],
        [0],
        [incorrectCalldata],
        nonce
      );
      await expect(
        dao.connect(alice).propose([dao.address], [0], [incorrectCalldata])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      await expect(
        dao
          .connect(bob)
          .execute(proposalId, [dao.address], [0], [incorrectCalldata], 1)
      ).to.be.revertedWithCustomError(dao, "ProposalExecutionFailed");
      expect(await dao.rewards(bob.address)).to.equal(0);
    });

    it("Revert if the nftContrat address is incorrect", async () => {
      const {
        alice,
        bob,
        dao,
        dwight,
        michael,
        jim,
        pam,
        daoTest,
        mockNftMarketplace,
      } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const incorrectNftContractAddr = getCalldata(
        mockNftMarketplace.address,
        jim.address,
        1,
        ethers.utils.parseEther("1")
      );

      const proposalId = await daoTest.hashProposal(
        [dao.address],
        [0],
        [incorrectNftContractAddr],
        nonce
      );
      await expect(
        dao
          .connect(alice)
          .propose([dao.address], [0], [incorrectNftContractAddr])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      await expect(
        dao
          .connect(bob)
          .execute(
            proposalId,
            [dao.address],
            [0],
            [incorrectNftContractAddr],
            1
          )
      ).to.be.revertedWithCustomError(dao, "ProposalExecutionFailed");
    });

    it("Revert if the sender is not the dao contract", async () => {
      const { alice, dao, mockNftMarketplace } = await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await expect(
        dao
          .connect(alice)
          .buyNFTFromMarketplace(
            mockNftMarketplace.address,
            mockNftMarketplace.address,
            1,
            ethers.utils.parseEther("1")
          )
      ).to.be.revertedWithCustomError(dao, "InvalidSender");
    });

    it("Allow members to propose a proposal to call external contracts", async () => {
      const { alice, bob, dao, dwight, michael, jim, pam, daoTest } =
        await setupFixture();
      await dao.connect(alice).buyMembership({ value: parseEther("1") });
      await dao.connect(bob).buyMembership({ value: parseEther("1") });
      await dao.connect(dwight).buyMembership({ value: parseEther("1") });
      await dao.connect(michael).buyMembership({ value: parseEther("1") });
      await dao.connect(jim).buyMembership({ value: parseEther("1") });
      await dao.connect(pam).buyMembership({ value: parseEther("1") });
      const nonce = (await dao.totalProposals()).add(1);
      const daoTestCalldata = getDaoTestCalldata(1, 3);

      const proposalId = await daoTest.hashProposal(
        [daoTest.address],
        [0],
        [daoTestCalldata],
        nonce
      );
      await expect(
        dao.connect(alice).propose([daoTest.address], [0], [daoTestCalldata])
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(proposalId, alice.address, 1);
      expect(await dao.totalProposals()).to.equal(1);
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect((await dao.proposals(proposalId)).startTime).to.equal(timestamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timestamp + ONE_DAY * 7
      );
      expect(await dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(alice.address, proposalId, true, 1);
      expect(await dao.connect(bob).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(bob.address, proposalId, true, 1);
      expect(await dao.connect(dwight).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(dwight.address, proposalId, true, 1);
      expect(await dao.connect(jim).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(jim.address, proposalId, true, 1);
      expect(await dao.connect(michael).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(michael.address, proposalId, true, 1);
      expect(await dao.connect(pam).vote(proposalId, true))
        .to.emit(dao, "VoteCast")
        .withArgs(pam.address, proposalId, true, 1);
      expect((await dao.proposals(proposalId)).forVotes).to.equal(6);
      expect((await dao.proposals(proposalId)).nonce).to.equal(1);
      expect((await dao.proposals(proposalId)).totalParticipants).to.equal(6);
      expect((await dao.proposals(proposalId)).totalMembersAtCreation).to.equal(
        6
      );
      timeTravelTo(timestamp + ONE_DAY * 7);
      expect(await daoTest.total()).to.equal(0);
      expect(await (await dao.membership(bob.address)).votingPower).to.equal(1);
      expect(
        await dao
          .connect(bob)
          .execute(proposalId, [daoTest.address], [0], [daoTestCalldata], 1)
      ).to.emit(dao, "ProposalExecuted");
      expect(await (await dao.membership(bob.address)).votingPower).to.equal(2);
      expect(await daoTest.total()).to.equal(4);
    });
  });
});
