import { BigNumber, ethers } from "ethers";

import IcoJSON from "../../artifacts/contracts/Ico.sol/Ico.json";
import SpaceCoinJSON from "../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const icoAddr = "0xdBaf8739133B5c7D429D14C190fDbf15D7be93e4";
const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinAddr = "0xCea4CD0ae4D35FA7b759786CC3F008033A3D0553";
const spaceCoinContract = new ethers.Contract(
  spaceCoinAddr,
  SpaceCoinJSON.abi,
  provider
);

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress());
  } catch (err) {
    console.log("Not signed in");
    await provider.send("eth_requestAccounts", []);
  }
}

ico_spc_buy.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  console.log("Buying", eth, "eth");

  await connectToMetamask();
  try {
    const unconfirmedTx = await icoContract
      .connect(signer)
      .contribute({ value: eth });
    await unconfirmedTx.wait();
    console.log(
      "contirbutions",
      ethers.utils.formatEther(
        BigNumber.from(
          await icoContract.contributions(await signer.getAddress())
        )
      )
    );
    ico_spc_left.innerHTML = ethers.utils.formatEther(
      ethers.utils
        .parseEther("150000")
        .sub(BigNumber.from(await icoContract.totalContributions()).mul(5))
    );
    ico_spc_earned.innerHTML = ethers.utils.formatEther(
      BigNumber.from(
        await icoContract.contributions(await signer.getAddress())
      ).mul(5)
    );
    ico_error.innerHTML = "";
  } catch (err) {
    console.log("err", err);
    ico_error.innerHTML = err.reason;
  }
});
