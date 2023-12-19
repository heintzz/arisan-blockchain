const { run } = require('hardhat');

const verifyArisanFactory = async (contractAddress, args) => {
  console.log(`Verifying contract...`);
  try {
    await run('verify:verify', {
      address: contractAddress,
    });
  } catch (error) {
    if (error.message.toLowerCase().includes('already verified')) {
      console.log('Contract already verified');
    } else {
      console.log(error);
    }
  }
};

const verifyArisan = async (contractAddress, args) => {
  console.log(`Verifying contract...`);
  try {
    await run('verify:verify', {
      address: contractAddress,
      arguments: args,
    });
  } catch (error) {
    if (error.message.toLowerCase().includes('already verified')) {
      console.log('Contract already verified');
    } else {
      console.log(error);
    }
  }
};

module.exports = { verifyArisanFactory, verifyArisan };
