require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-ethers');
require('hardhat-deploy');

/** @type import('hardhat/config').HardhatUserConfig */
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/example';
const PRIVATE_KEY_SEPOLIA = process.env.PRIVATE_KEY_SEPOLIA || 'Oxkey';
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'key';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'key';

module.exports = {
  solidity: '0.8.8',
  defaultNetwork: 'hardhat',
  networks: {
    sepolia: {
      url: `${SEPOLIA_RPC_URL}/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_SEPOLIA],
      chainId: 11155111,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 200000,
  },
};
