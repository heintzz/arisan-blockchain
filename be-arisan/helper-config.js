const networkConfig = {
  name: "sepolia",
  vrfCoordinatorV2: "0x447Fd5eC2D383091C22B8549cb231a3bAD6d3fAf",
  gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
  subscriptionId: "7264",
  callbackGasLimit: "500000",
};

const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

module.exports = {
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
};
