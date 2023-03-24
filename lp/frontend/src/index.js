import { BigNumber, ethers } from "ethers";
import RouterJSON from "../../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json";
import IcoJSON from "../../artifacts/contracts/Ico.sol/Ico.json";
import SpaceCoinJSON from "../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const icoAddr = "0x0B56B88145007Da30e6b310b9f787E03f31838e5";
const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinAddr = "0x2933c658780016660E762F78d53572781Bea5b2B";
const spaceCoinContract = new ethers.Contract(
  spaceCoinAddr,
  SpaceCoinJSON.abi,
  provider
);

const routerAddr = "0x902249587F941367865155FD1AC6d492fd81665B";
const contract = new ethers.Contract(routerAddr, RouterJSON.abi, provider);

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress());
  } catch (err) {
    console.log("Not signed in");
    await provider.send("eth_requestAccounts", []);
  }
}

const getIcoPhase = (phase) => {};

//
// ICO
//
ico_spc_buy.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  console.log("Buying", eth, "eth");

  await connectToMetamask();
  // TODO: Call ico contract contribute function
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

ico_spc_redeem.addEventListener("click", async (e) => {
  console.log("clicked");
  await connectToMetamask();

  try {
    const unconfirmedTx = await icoContract.connect(signer).redeemSPC();
    await unconfirmedTx.wait();
    ico_spc_earned.innerHTML = "0";
    ico_spc_redeem_error.innerHTML = "";
  } catch (err) {
    console.log("err", err);
    ico_spc_redeem_error.innerHTML = err.reason;
  }
});

ico_advance_phase.addEventListener("click", async (e) => {
  await connectToMetamask();

  try {
    const unconfirmedTx = await icoContract.connect(signer).advanceICOPhase();
    await unconfirmedTx.wait();
  } catch (err) {
    console.log("err", err);
    ico_phase_error.innerHTML = err.reason;
  }
});

ico_check_phase.addEventListener("click", async (e) => {
  await connectToMetamask();

  try {
    console.log(
      "check phase",
      await icoContract.connect(signer).currentPhase()
    );
    let phase;
    const numericPhase = await icoContract.connect(signer).currentPhase();
    switch (numericPhase) {
      case 0: {
        phase = "Seed phase";
        break;
      }
      case 1: {
        phase = "General phase";
        break;
      }
      case 2: {
        phase = "Open phase";
        break;
      }
    }
    ico_phase.innerHTML = phase;
  } catch (err) {
    console.log("err", err);
    ico_phase_error.innerHTML = err.reason;
  }
});

//
// LP
//
let currentSpcToEthPrice = 5;

provider.on("block", (n) => {
  console.log("New block", n);
  // TODO: Update currentSpcToEthPrice
});

lp_deposit.eth.addEventListener("input", (e) => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice;
});

lp_deposit.spc.addEventListener("input", (e) => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice;
});

lp_deposit.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  const spc = ethers.utils.parseEther(form.spc.value);
  console.log("Depositing", eth, "eth and", spc, "spc");

  await connectToMetamask();
  // TODO: Call router contract deposit function
});

lp_withdraw.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Withdrawing 100% of LP");

  await connectToMetamask();
  // TODO: Call router contract withdraw function
});

//
// Swap
//
let swapIn = { type: "eth", value: 0 };
let swapOut = { type: "spc", value: 0 };
switcher.addEventListener("click", () => {
  [swapIn, swapOut] = [swapOut, swapIn];
  swap_in_label.innerText = swapIn.type.toUpperCase();
  swap.amount_in.value = swapIn.value;
  updateSwapOutLabel();
});

swap.amount_in.addEventListener("input", updateSwapOutLabel);

function updateSwapOutLabel() {
  swapOut.value =
    swapIn.type === "eth"
      ? +swap.amount_in.value * currentSpcToEthPrice
      : +swap.amount_in.value / currentSpcToEthPrice;

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`;
}

swap.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const amountIn = ethers.utils.parseEther(form.amount_in.value);

  const maxSlippage = form.max_slippage.value;
  console.log("max slippage value:", maxSlippage);

  console.log(
    "Swapping",
    ethers.utils.formatEther(amountIn),
    swapIn.type,
    "for",
    swapOut.type
  );

  await connectToMetamask();
  // TODO: Call router contract swap function
});
