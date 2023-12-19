const { network } = require('hardhat');
const { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require('../helper-hardhat-config');
const { verifyArisanFactory } = require('../utils/verify');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  const arisanFactory = await deploy('ArisanFactory', {
    from: deployer,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verifyArisanFactory(arisanFactory.address);
  }
};

module.exports.tags = ['all', 'arisan'];
