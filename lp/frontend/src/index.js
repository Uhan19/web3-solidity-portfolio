import { BigNumber, ethers } from "ethers";
import RouterJSON from "../../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json";
import IcoJSON from "../../artifacts/contracts/Ico.sol/Ico.json";
import SpaceCoinJSON from "../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json";
import SpaceLPJSON from "../../artifacts/contracts/SpaceLP.sol/SpaceLP.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const icoAddr = "0x3474787599bACDB5cD192087a18A1f0549F9BbAE";
const spaceCoinAddr = "0x36a76A3db7Ba5bF117F04fa8b4c692378dcBD475";
const routerAddr = "0xF3CA8aE2F2282Ab42Ac9202A8a873B23B89800A6";
const lpAddress = "0x7056a23Aa086fd4dBf4B7d5bB95fc2B4600bCe6A";

const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinContract = new ethers.Contract(
  spaceCoinAddr,
  SpaceCoinJSON.abi,
  provider
);

const spaceRouterContract = new ethers.Contract(
  routerAddr,
  RouterJSON.abi,
  provider
);

const spaceLpContract = new ethers.Contract(
  lpAddress,
  SpaceLPJSON.abi,
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

provider.on("block", async (n) => {
  console.log("New block", n);
  // TODO: Update currentSpcToEthPrice
  try {
    const currentSPCPoolBalance = await spaceLpContract.spcBalance();
    const currentEthPoolBalance = await spaceLpContract.ethBalance();
    currentSpcToEthPrice =
      currentEthPoolBalance > 0
        ? currentSPCPoolBalance / currentEthPoolBalance
        : 0;
  } catch (err) {
    console.log("ratio calculation error", err);
  }
});

lp_deposit.eth.addEventListener("input", (e) => {
  if (currentSpcToEthPrice === 0) {
    return;
  } else {
    lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice;
  }
});

lp_deposit.spc.addEventListener("input", (e) => {
  if (currentSpcToEthPrice === 0) {
    return;
  } else {
    lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice;
  }
});

lp_deposit.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  const spc = ethers.utils.parseEther(form.spc.value);
  console.log("Depositing", eth, "eth and", spc, "spc");

  await connectToMetamask();
  // TODO: Call router contract deposit function
  try {
    const unconfirmedTxApprove = await spaceCoinContract
      .connect(signer)
      .approve(routerAddr, spc);
    await unconfirmedTxApprove.wait();
    const unconfirmedTx = await spaceRouterContract
      .connect(signer)
      .addLiquidity(spc, { value: eth });
    await unconfirmedTx.wait();
  } catch (err) {
    console.log("err", err);
    lp_deposit_error.innerHTML = err.reason;
  }
});

check_pool_balance.addEventListener("click", async (e) => {
  try {
    const currentSPCPoolBalance = await spaceLpContract.spcBalance();
    const currentEthPoolBalance = await spaceLpContract.ethBalance();
    const userSPCBalance = await spaceCoinContract
      .connect(signer)
      .balanceOf(signer.getAddress());
    signer_spc_balance.innerHTML = ethers.utils.formatEther(userSPCBalance);
    pool_spc.innerHTML = ethers.utils.formatEther(currentSPCPoolBalance);
    pool_eth.innerHTML = ethers.utils.formatEther(currentEthPoolBalance);
  } catch (err) {
    console.log("err", err);
    lp_deposit_error.innerHTML = err.reason;
  }
});

lp_withdraw.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Withdrawing 100% of LP");

  await connectToMetamask();
  // TODO: Call router contract withdraw function'
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
  try {
    if (swapIn.type === "eth") {
      const price = await spaceLpContract.quoteSwapPrice(amountIn, 0);
      const spcOutMin = price.sub(price.mul(maxSlippage).div(100));
      console.log(
        "form.amount_in.value",
        ethers.utils.parseEther(form.amount_in.value)
      );
      const swapTx = await spaceRouterContract
        .connect(signer)
        .swapETHForSPC(spcOutMin, {
          value: amountIn,
        });
      await swapTx.wait();
    } else if (swapIn.type === "spc") {
      const price = await spaceLpContract.quoteSwapPrice(0, amountIn);
      const ethOutMin = price.sub(price.mul(maxSlippage).div(100));
      const approveTx = await spaceCoinContract
        .connect(signer)
        .approve(routerAddr, amountIn);
      await approveTx.wait();
      const swapTx = await spaceRouterContract
        .connect(signer)
        .swapSPCForETH(amountIn, ethOutMin);
      await swapTx.wait();
    }
  } catch (err) {
    console.log("err", err);
    swap_error.innerHTML = err.reason;
  }
});
