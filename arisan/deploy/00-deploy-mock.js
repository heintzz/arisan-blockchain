const { ethers, network } = require('hardhat');

const BASE_FEE = ethers.parseEther('0.25');
const GAS_PRICE_LINK = 1e9;

const fundAmount = ethers.parseEther('2');

module.exports = async ({ _, deployments }) => {
  const { log } = deployments;
  const chainId = network.config.chainId;

  if (chainId == 31337) {
    log('Local network detected! Deploying mocks...');
    const VRFCoordinatorV2MockFactory = await ethers.getContractFactory('VRFCoordinatorV2Mock');
    const VRFCoordinatorV2Mock = await VRFCoordinatorV2MockFactory.deploy(BASE_FEE, GAS_PRICE_LINK);

    const transactionReceipt = await VRFCoordinatorV2Mock.createSubscription();
    const transactionResponse = await transactionReceipt.wait(1);
    const subscriptionId = BigInt(transactionResponse.logs[0].topics[1]);
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount);

    const vrfCoordinatorAddress = await VRFCoordinatorV2Mock.getAddress();

    log(`Subscription ID: ${subscriptionId}`);
    log(`VRFCoordinatorV2Mock deployed at ${vrfCoordinatorAddress}`);
  }
};

module.exports.tags = ['all', 'mock'];
