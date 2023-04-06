import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Airdrop, ERC20, MacroToken } from "../typechain-types";
import {
  keccak256,
  defaultAbiCoder,
  solidityPack,
  parseEther,
} from "ethers/lib/utils";
import { BigNumber } from "ethers";

type LeavesType = Array<string>;

const provider = ethers.provider;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let rest: SignerWithAddress[];

let macroToken: MacroToken;
let airdrop: Airdrop;
let merkleRoot: string;
let leaves: LeavesType = [];

const createMerkleTree = (leaves: LeavesType) => {
  let nodes = [...leaves];

  while (nodes.length > 1) {
    let nextLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] || left;
      const encoded = defaultAbiCoder.encode(
        ["bytes32", "bytes32"],
        [left, right]
      );
      const parent = keccak256(solidityPack(["bytes"], [encoded]));
      nextLevel.push(parent);
    }
    nodes = nextLevel;
  }
  // return the merkle root
  return nodes[0];
};

const generateMerkleProof = (leaves: LeavesType, leaf: string) => {
  let proof = [];
  let index = leaves.indexOf(leaf);
  let nodes = [...leaves];

  while (nodes.length > 1) {
    let nextLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      let left = nodes[i];
      let right = nodes[i + 1] || left;
      if (i === index || i + 1 === index) {
        proof.push(i === index ? right : left);
      }
      const encoded = defaultAbiCoder.encode(
        ["bytes32", "bytes32"],
        [left, right]
      );
      const parent = keccak256(solidityPack(["bytes"], [encoded]));
      nextLevel.push(parent);
    }
    nodes = nextLevel;
    index = Math.floor(index / 2);
  }
  return proof;
};

// Function used to test verify merkle proof
const verify = (address: string, amount: BigNumber) => {
  const encoded = defaultAbiCoder.encode(
    ["address", "uint256"],
    [address, amount]
  );
  let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
  const proof = generateMerkleProof(leaves, nodeHash);
  for (let i = 0; i < proof.length; i++) {
    const leaf = proof[i];
    let newEncoded;
    if (nodeHash < leaf) {
      newEncoded = defaultAbiCoder.encode(
        ["bytes32", "bytes32"],
        [nodeHash, leaf]
      );
      nodeHash = keccak256(solidityPack(["bytes"], [newEncoded]));
    } else {
      newEncoded = defaultAbiCoder.encode(
        ["bytes32", "bytes32"],
        [leaf, nodeHash]
      );
      nodeHash = keccak256(solidityPack(["bytes"], [newEncoded]));
    }
  }
  return nodeHash === merkleRoot;
};

describe("Airdrop", function () {
  const setupFixture = async () => {
    const chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

    const domainType = {
      name: "Airdrop",
      version: "v1",
      chainId,
      verifyingContract: airdrop.address,
    };

    const claimType = {
      Claim: [
        { name: "claimer", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };

    return {
      domainType,
      claimType,
    };
  };
  before(async () => {
    [account1, account2, ...rest] = await ethers.getSigners();

    macroToken = (await (
      await ethers.getContractFactory("MacroToken")
    ).deploy("Macro Token", "MACRO")) as MacroToken;
    await macroToken.deployed();
    for (let i = 0; i < 4; i++) {
      const address = await rest[i].getAddress();
      const amount = parseEther("10").mul(i + 1);
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [address, amount]
      );
      const leaf = keccak256(solidityPack(["bytes"], [encoded]));
      leaves.push(leaf);
    }
    // sort the leaves
    leaves.sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
    // TODO: The bytes32 value below is just a random hash in order to get the tests to pass.
    // You must create a merkle tree for testing, computes it root, then set it here
    merkleRoot = createMerkleTree(leaves);
  });

  beforeEach(async () => {
    airdrop = await (
      await ethers.getContractFactory("Airdrop")
    ).deploy(merkleRoot, account1.address, macroToken.address);
    await airdrop.deployed();
  });

  describe("setup and disabling ECDSA", () => {
    it("should deploy correctly", async () => {
      // if the beforeEach succeeded, then this succeeds
    });

    it("should disable ECDSA verification", async () => {
      // first try with non-owner user
      await expect(
        airdrop.connect(account2).disableECDSAVerification()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // now try with owner
      await expect(airdrop.disableECDSAVerification())
        .to.emit(airdrop, "ECDSADisabled")
        .withArgs(account1.address);
    });
  });

  describe("Merkle claiming", () => {
    it("Should be able to claim token using merkleClaim", async () => {
      const amount = parseEther("10");
      const signer = rest[0];
      const signerAddress = await signer.getAddress();
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [signerAddress, amount]
      );
      let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
      const proof = generateMerkleProof(leaves, nodeHash);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        await airdrop.connect(signer).merkleClaim(proof, signerAddress, amount)
      )
        .to.emit(macroToken, "Transfer")
        .withArgs(airdrop.address, signerAddress, amount);
    });

    it("Should be able to claim token using merkleClaim - send token to different address", async () => {
      const amount = parseEther("20");
      const signer = rest[1];
      const signerAddress = await signer.getAddress();
      const receiver = rest[8];
      const receiverAddress = await receiver.getAddress();
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [signerAddress, amount]
      );
      let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
      const proof = generateMerkleProof(leaves, nodeHash);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        await airdrop
          .connect(signer)
          .merkleClaim(proof, receiverAddress, amount)
      )
        .to.emit(macroToken, "Transfer")
        .withArgs(airdrop.address, receiverAddress, amount);
    });

    it("Should be able to claim token using merkleClaim - different signer", async () => {
      const amount = parseEther("30");
      const signer = rest[2];
      const signerAddress = await signer.getAddress();
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [signerAddress, amount]
      );
      let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
      const proof = generateMerkleProof(leaves, nodeHash);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        await airdrop.connect(signer).merkleClaim(proof, signerAddress, amount)
      )
        .to.emit(macroToken, "Transfer")
        .withArgs(airdrop.address, signerAddress, amount);
    });

    it("revert if already claimed", async () => {
      const amount = parseEther("10");
      const signer = rest[0];
      const signerAddress = await signer.getAddress();
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [signerAddress, amount]
      );
      let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
      const proof = generateMerkleProof(leaves, nodeHash);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        airdrop.connect(signer).merkleClaim(proof, signerAddress, amount)
      )
        .to.emit(macroToken, "Transfer")
        .withArgs(airdrop.address, signerAddress, amount);
      await expect(
        airdrop.connect(signer).merkleClaim(proof, signerAddress, amount)
      ).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
    });

    it("revert if already wrong amount is passed in", async () => {
      const amount = parseEther("11");
      const signer = rest[0];
      const signerAddress = await signer.getAddress();
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [signerAddress, amount]
      );
      let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
      const proof = generateMerkleProof(leaves, nodeHash);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        airdrop.connect(signer).merkleClaim(proof, signerAddress, amount)
      ).to.be.revertedWithCustomError(airdrop, "InvalidMerkleProof");
    });

    it("revert if address is not part of the merkle tree", async () => {
      const amount = parseEther("10");
      const signer = rest[0];
      const invalidSigner = rest[11];
      const signerAddress = await signer.getAddress();
      const fakeAddress = await invalidSigner.getAddress();
      const encoded = defaultAbiCoder.encode(
        ["address", "uint256"],
        [signerAddress, amount]
      );
      let nodeHash = keccak256(solidityPack(["bytes"], [encoded]));
      const proof = generateMerkleProof(leaves, nodeHash);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        airdrop.connect(invalidSigner).merkleClaim(proof, fakeAddress, amount)
      ).to.be.revertedWithCustomError(airdrop, "InvalidMerkleProof");
    });
  });

  describe("Signature claiming", () => {
    it("Should allow signature claim", async () => {
      const { domainType, claimType } = await setupFixture();
      const amount = parseEther("10");
      const claimer = rest[0];
      const claimerAddress = await claimer.getAddress();
      const message = {
        claimer: claimerAddress,
        amount: amount.toString(),
      };

      // Sign the typed data
      const sig = await account1._signTypedData(domainType, claimType, message);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        airdrop.connect(claimer).signatureClaim(sig, claimerAddress, amount)
      )
        .to.emit(macroToken, "Transfer")
        .withArgs(airdrop.address, claimerAddress, amount);
    });

    it("Revert if token already claimed", async () => {
      const { domainType, claimType } = await setupFixture();
      const amount = parseEther("10");
      const claimer = rest[0];
      const claimerAddress = await claimer.getAddress();
      const message = {
        claimer: claimerAddress,
        amount: amount.toString(),
      };

      // Sign the typed data
      const sig = await account1._signTypedData(domainType, claimType, message);
      await macroToken.mint(airdrop.address, amount);
      await expect(
        airdrop.connect(claimer).signatureClaim(sig, claimerAddress, amount)
      )
        .to.emit(macroToken, "Transfer")
        .withArgs(airdrop.address, claimerAddress, amount);

      await expect(
        airdrop.connect(claimer).signatureClaim(sig, claimerAddress, amount)
      ).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
    });

    it("Revert if signature is the wrong type", async () => {
      const { domainType, claimType } = await setupFixture();
      const amount = parseEther("10");
      const claimer = rest[0];
      const claimerAddress = await claimer.getAddress();
      const message = {
        claimer: claimerAddress,
        amount: amount.toString(),
      };

      // Sign the typed data
      const sig =
        "0x6ed965f6f0d4ddb4b431754eec3ea2fcde76e54dc464ea92e0629fcd34e4fecc1da270c5279b806d350d71cda024d143f517169a97411f03dda78210175e21941b";
      await macroToken.mint(airdrop.address, amount);
      await expect(
        airdrop.connect(claimer).signatureClaim(sig, claimerAddress, amount)
      ).to.be.revertedWithCustomError(airdrop, "InvalidSignature");
    });
  });
});
