const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { networkConfig } = require('../helper-hardhat-config');
const { ethers } = require('hardhat');

describe('Simple Arisan Unit Test 🌦️', function () {
  async function deployContractLoadFixture() {
    const [deployer, hasnan, alice, bob] = await ethers.getSigners();

    const BASE_FEE = '100000000000000000';
    const GAS_PRICE_LINK = '1000000000';

    const chainId = network.config.chainId;

    const VRFCoordinatorV2MockFactory = await ethers.getContractFactory('VRFCoordinatorV2Mock');
    const VRFCoordinatorV2Mock = await VRFCoordinatorV2MockFactory.deploy(BASE_FEE, GAS_PRICE_LINK);

    const fundAmount = ethers.parseEther('2');
    const transactionReceipt = await VRFCoordinatorV2Mock.createSubscription();
    const transactionResponse = await transactionReceipt.wait(1);
    const subscriptionId = BigInt(transactionResponse.logs[0].topics[1]);
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount);

    const vrfCoordinatorAddress = await VRFCoordinatorV2Mock.getAddress();
    const gasLane = networkConfig[chainId].gasLane;
    const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
    const paymentAmount = ethers.parseEther('0.02');
    const maxParticipants = 2;

    const ArisanFactory = await ethers.getContractFactory('ArisanFactory');
    const arisanFactory = await ArisanFactory.deploy();

    // by default connect ke deployer
    // di kasus ini hasnan jadi creator arisan
    await arisanFactory
      .connect(hasnan)
      .createArisan(
        vrfCoordinatorAddress,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        paymentAmount,
        maxParticipants,
      );

    const deployedArisanAddress = await arisanFactory.arisans(0);
    const deployedArisan = await ethers.getContractAt('Arisan', deployedArisanAddress);
    await VRFCoordinatorV2Mock.addConsumer(subscriptionId, deployedArisanAddress);

    return {
      arisanFactory,
      deployer,
      hasnan,
      alice,
      bob,
      deployedArisan,
      VRFCoordinatorV2Mock,
    };
  }

  describe('Deploy Arisan', function () {
    it('Should set the right organizer', async function () {
      const { hasnan, deployedArisan } = await loadFixture(deployContractLoadFixture);
      expect(await deployedArisan.getOrganizer()).to.equal(hasnan.address);
    });

    it('Should have initial 0 participants', async function () {
      const { deployedArisan } = await loadFixture(deployContractLoadFixture);
      expect(await deployedArisan.getParticipantCount()).to.equal(0);
    });
  });

  describe('Create Arisan', function () {
    it('Should set 0.02 ETH as payment amount', async function () {
      const { deployedArisan } = await loadFixture(deployContractLoadFixture);
      const paymentAmount = await deployedArisan.getPaymentAmount();
      expect(ethers.formatUnits(paymentAmount, 'ether')).to.equal('0.02');
    });

    it('Should set max participants to 2 ', async function () {
      const { deployedArisan } = await loadFixture(deployContractLoadFixture);
      const maxParticipants = await deployedArisan.getMaxParticipants();
      expect(maxParticipants).to.equal(2);
    });

    it('The length should become 1', async function () {
      const { arisanFactory } = await loadFixture(deployContractLoadFixture);

      const countArisan = await arisanFactory.getArisanCount();
      expect(countArisan).to.equal(1);
    });
  });

  describe('Delete Arisan', function () {
    it('Should allow the organizer to delete arisan', async function () {
      const { arisanFactory, hasnan } = await loadFixture(deployContractLoadFixture);

      const before = await arisanFactory.getArisanCount();
      await arisanFactory.connect(hasnan).deleteArisan(0);
      const after = await arisanFactory.getArisanCount();

      expect(Number(before) - 1).to.equal(Number(after));
    });

    it('Should revert if trying to delete arisan with non-organizer account', async function () {
      const { arisanFactory, alice } = await loadFixture(deployContractLoadFixture);

      await expect(arisanFactory.connect(alice).deleteArisan(0)).to.be.revertedWithCustomError(
        arisanFactory,
        'Arisan__UnauthorizedToDelete',
      );
    });
  });

  describe('Join Arisan', function () {
    it('Should allow a participant to join arisan', async function () {
      const { deployedArisan, alice } = await loadFixture(deployContractLoadFixture);

      await deployedArisan.connect(alice).joinArisan();

      const participantCount = await deployedArisan.getParticipantCount();
      expect(participantCount).to.equal(1);
    });

    it('Should add corresponding participant', async function () {
      const { deployedArisan, alice } = await loadFixture(deployContractLoadFixture);

      await deployedArisan.connect(alice).joinArisan();

      const participant = (await deployedArisan.getParticipants())[0];
      expect(participant).to.equal(alice.address);
    });

    it('Should revert if trying to join a full arisan', async function () {
      const { deployedArisan, alice, bob, hasnan } = await loadFixture(deployContractLoadFixture);

      await deployedArisan.connect(alice).joinArisan();
      await deployedArisan.connect(bob).joinArisan();

      console.log('\tNumber of participants:', Number(await deployedArisan.getParticipantCount()));
      console.log('\tMaximum participants:', Number(await deployedArisan.getMaxParticipants()));
      await expect(deployedArisan.connect(hasnan).joinArisan()).to.be.revertedWithCustomError(
        deployedArisan,
        'Arisan__Full',
      );
    });

    it('Should revert if trying to join a closed arisan', async function () {
      const { deployedArisan, hasnan, alice } = await loadFixture(deployContractLoadFixture);

      await deployedArisan.connect(hasnan).closeArisan();

      const status = await deployedArisan.getStatus();
      console.log('\tStatus:', status === BigInt(1) ? 'CLOSED' : 'OPEN');

      await expect(deployedArisan.connect(alice).joinArisan()).to.be.revertedWithCustomError(
        deployedArisan,
        'Arisan__Closed',
      );
    });
  });

  describe('Pay Arisan', function () {
    it('Should allow participant to pay arisan', async function () {
      const { deployedArisan, alice } = await loadFixture(deployContractLoadFixture);

      console.log('\tSufficient balance');
      console.log(
        '\tBalance before: %s WEI',
        Number(await ethers.provider.getBalance(alice.address)),
      );
      console.log(
        '\tPot balance before: %s',
        ethers.formatUnits(await deployedArisan.getArisanPot(), 'ether'),
      );

      const paymentAmount = ethers.parseEther('0.02');
      await deployedArisan.connect(alice).joinArisan();
      await deployedArisan.connect(alice).payArisan({ value: paymentAmount });

      const potAmount = await deployedArisan.getPaymentAmount();

      console.log('\t%s paid %s', alice.address, '0.02');
      console.log(
        '\tPot balance after: %s',
        ethers.formatUnits(await deployedArisan.getArisanPot(), 'ether'),
      );
      console.log(
        '\tBalance after: %s WEI',
        Number(await ethers.provider.getBalance(alice.address)),
      );

      expect(paymentAmount).to.equal(potAmount);
    });

    it('Should revert if trying to pay less than payment amount', async function () {
      const { deployedArisan, alice } = await loadFixture(deployContractLoadFixture);

      const paymentAmount = ethers.parseEther('0.01');
      await expect(
        deployedArisan.connect(alice).payArisan({ value: paymentAmount }),
      ).to.be.revertedWithCustomError(deployedArisan, 'Arisan__InvalidPaymentAmount');

      console.log('\tInsufficient balance');
      console.log(
        '\tBalance before: %s WEI',
        Number(await ethers.provider.getBalance(alice.address)),
      );
      console.log('\tPot balance before: %s', Number(await deployedArisan.getArisanPot()));
      console.log('\t%s paid %s', alice.address, '0.01');
      console.log('\tPot balance after: %s', Number(await deployedArisan.getArisanPot()));
      console.log(
        '\tBalance after: %s WEI',
        Number(await ethers.provider.getBalance(alice.address)),
      );
    });

    it('Should revert if trying to pay but not a participant', async function () {
      const { deployedArisan, alice } = await loadFixture(deployContractLoadFixture);

      const paymentAmount = ethers.parseEther('0.02');
      await expect(
        deployedArisan.connect(alice).payArisan({ value: paymentAmount }),
      ).to.be.revertedWithCustomError(deployedArisan, 'Participant__NotAParticipant');
    });
  });

  describe('Pick Winner', function () {
    let deployedArisan, hasnan, alice, bob, VRFCoordinatorV2Mock;

    beforeEach(async function () {
      ({ deployedArisan, hasnan, alice, bob, VRFCoordinatorV2Mock } =
        await loadFixture(deployContractLoadFixture));

      await deployedArisan.connect(alice).joinArisan();
      await deployedArisan.connect(bob).joinArisan();
    });

    it('Should have 2 participants', async function () {
      const participantCount = await deployedArisan.getParticipantCount();

      for (let i = 0; i < participantCount; i++) {
        console.log('\tArisan %s: %s', i, await deployedArisan.participants(i));
      }
      expect(participantCount).to.equal(BigInt(2));
    });

    it('Can request random words', async function () {
      await expect(deployedArisan.connect(hasnan).requestRandomWords()).to.emit(
        deployedArisan,
        'RandomWordsRequested',
      );
    });

    it('Should pick a random winner', async function () {
      const paymentAmount = ethers.parseEther('0.02');
      await deployedArisan.connect(alice).payArisan({ value: paymentAmount });
      await deployedArisan.connect(bob).payArisan({ value: paymentAmount });

      await new Promise(async (resolve, reject) => {
        deployedArisan.on('RandomWordsRequested', async () => {
          try {
            await expect(
              VRFCoordinatorV2Mock.fulfillRandomWords(
                await deployedArisan.s_requestId(),
                await deployedArisan.getAddress(),
              ),
            ).to.emit(deployedArisan, 'WinnerSelected');
            resolve();
          } catch (e) {
            reject(e);
          }
        });

        try {
          const tx = await deployedArisan.connect(hasnan).requestRandomWords();
          await tx.wait(1);
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
