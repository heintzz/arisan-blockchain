require("dotenv").config();

const express = require("express");
const { ethers, JsonRpcProvider } = require("ethers");
const { networkConfig, VERIFICATION_BLOCK_CONFIRMATIONS } = require("./helper-config");
const arisanFactoryAddress = "0x27fb62d07e8cd2702265b48768c45ba49f051a1a";
const arisanABI = require("./contracts/Arisan.json").abi;
const arisanFactoryABI = require("./contracts/ArisanFactory.json").abi;
const sepoliaProvider = process.env.SEPOLIA_RPC_URL + "/" + process.env.INFURA_API_KEY;
const provider = new JsonRpcProvider(sepoliaProvider);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_SEPOLIA, provider);
const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY_SEPOLIA_2, provider);
const arisanFactoryContract = new ethers.Contract(arisanFactoryAddress, arisanFactoryABI, wallet);

const VRFCoordinatorV2Address = networkConfig["vrfCoordinatorV2"];
const subscriptionId = networkConfig["subscriptionId"];
const gasLane = networkConfig.gasLane;
const callbackGasLimit = networkConfig.callbackGasLimit;

const app = express();
const port = 4000;

app.use(express.json());

// ARISAN FACTORY SMART CONTRACT ENDPOINT
// Get arisan list
app.get("/arisan-factory", async (req, res) => {
  const arisanList = await arisanFactoryContract.getArisanList();
  res.json({ arisanList });
});

// Return the count of arisan in arisan factory sc
app.get("/arisan-factory/count", async (req, res) => {
  const arisanCount = await arisanFactoryContract.getArisanCount();
  res.json({ arisanCount: Number(arisanCount) });
});

// Create arisan smart contract
app.get("/arisan-factory/create", async (req, res) => {
  // payment amount must be in string
  // const { paymentAmount, maxParticipants } = req.body;
  const countBefore = await arisanFactoryContract.getArisanCount();
  const txCreateArisan = await arisanFactoryContract
    .connect(wallet)
    .createArisan(
      VRFCoordinatorV2Address,
      gasLane,
      subscriptionId,
      callbackGasLimit,
      ethers.parseEther("0.002"),
      3
    );
  await txCreateArisan.wait(VERIFICATION_BLOCK_CONFIRMATIONS);
  const countAfter = await arisanFactoryContract.getArisanCount();

  if (countAfter == countBefore) {
    res.json({ success: false, message: "Arisan not created!" });
  } else {
    res.json({ success: true, message: "Arisan created!" });
  }
});

// Return arisan smart contract for the corresponding id
app.get("/arisan-factory/:id", async (req, res) => {
  const id_arisan_factory = req.params.id;
  const arisan = await arisanFactoryContract.getArisanById(id_arisan_factory);
  res.json({ arisan });
});

app.get("/arisan-factory/delete/:id", async (req, res) => {
  const id_arisan_factory = req.params.id;
  await arisanFactoryContract.connect(wallet).deleteArisan(id_arisan_factory);
  res.json({ success: true, message: `Arisan deleted!` });
});

// ARISAN SMART CONTRACT ENDPOINT
// Return payment amount on corresponding arisan smart contract
app.get("/arisan/:id", async (req, res) => {
  const arisanContractAddress = req.params.id;
  const arisan = new ethers.Contract(arisanContractAddress, arisanABI, wallet);

  res.json({
    organizer: await arisan.getOrganizer(),
    arisanStatus: Number(await arisan.getStatus()),
    maxParticipants: Number(await arisan.getMaxParticipants()),
    paymentAmount: Number(await arisan.getPaymentAmount()),
    participants: await arisan.getParticipants(),
  });
});

app.get("/arisan/:id/close", async (req, res) => {
  const arisanContractAddress = req.params.id;
  const arisan = new ethers.Contract(arisanContractAddress, arisanABI, wallet);

  await arisan.closeArisan();

  res.json({
    arisanStatus: Number(await arisan.getStatus()),
  });
});

app.get("/arisan/:id/join", async (req, res) => {
  const arisanContractAddress = req.params.id;
  const arisan = new ethers.Contract(arisanContractAddress, arisanABI, wallet2);
  await arisan.joinArisan();

  res.json({
    participants: await arisan.getParticipants(),
  });
});

app.get("/arisan/:id/pay", async (req, res) => {
  const arisanContractAddress = req.params.id;
  const arisan = new ethers.Contract(arisanContractAddress, arisanABI, wallet);

  try {
    const tx = await arisan.payArisan({ value: ethers.parseEther("0.002") });
    res.json({
      success: true,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/arisan/:id/pick-winner", async (req, res) => {
  const arisanContractAddress = req.params.id;
  const arisan = new ethers.Contract(arisanContractAddress, arisanABI, wallet);
  const tx = await arisan.requestRandomWords();

  console.log(tx);

  res.json({
    // winnerHistory: await arisan.getWinnerHistory(),
    // success: true,
  });
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
