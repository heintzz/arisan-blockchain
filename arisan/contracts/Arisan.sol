// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';

error Arisan__Closed();
error Arisan__Full();
error Arisan__TransferFailed();
error Arisan__InvalidPaymentAmount(uint256 _paymentAmount);

error Participant__AlreadyJoined();
error Participant__NotAParticipant();

import 'hardhat/console.sol';

contract Arisan is VRFConsumerBaseV2 {
  // Type
  enum ArisanStatus {
    OPEN,
    CLOSED
  }

  // Immutable
  address private immutable i_organizer;
  uint256 private immutable i_paymentAmount;

  // State
  ArisanStatus public status;
  uint256 private maxParticipants;
  address payable[] public participants;
  address payable[] public paidParticipants;
  address[] public winnerHistory;
  uint256 private s_pot;

  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATION = 3;
  uint32 private constant NUM_WORDS = 1;

  uint256 public s_requestId;
  uint256[] public s_randomWords;

  constructor(
    address organizer,
    address vrfCoordinator, // contract address
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 paymentAmount,
    uint256 _maxParticipants
  ) VRFConsumerBaseV2(vrfCoordinator) {
    i_organizer = organizer;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    i_paymentAmount = paymentAmount;
    maxParticipants = _maxParticipants;
    status = ArisanStatus.OPEN;
  }

  event RandomWordsRequested(uint256 indexed requestId);
  event ReturnedRandomness(uint256[] randomWords);
  event WinnerSelected(address winner);

  function joinArisan() public payable {
    if (status == ArisanStatus.CLOSED) {
      revert Arisan__Closed();
    }

    if (participants.length == maxParticipants) {
      revert Arisan__Full();
    }

    for (uint256 i = 0; i < participants.length; i++) {
      if (participants[i] == msg.sender) {
        revert Participant__AlreadyJoined();
      }
    }

    participants.push(payable(msg.sender));
  }

  function payArisan() public payable {
    bool isParticipant = false;

    for (uint256 i = 0; i < participants.length; i++) {
      if (participants[i] == msg.sender) {
        isParticipant = true;
      }
    }

    if (msg.value != i_paymentAmount) {
      revert Arisan__InvalidPaymentAmount(msg.value);
    }

    if (isParticipant) {
      s_pot += msg.value;
      paidParticipants.push(payable(msg.sender));
    } else {
      revert Participant__NotAParticipant();
    }
  }

  function requestRandomWords() external onlyOrganizer {
    status = ArisanStatus.CLOSED;
    s_requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATION,
      i_callbackGasLimit,
      NUM_WORDS
    );
    emit RandomWordsRequested(s_requestId);
  }

  function fulfillRandomWords(
    uint256 /* requestId */,
    uint256[] memory randomWords
  ) internal override {
    s_randomWords = randomWords;

    console.log('\tRandom Words: %s', s_randomWords[0]);

    uint256 winnerIndex = s_randomWords[0] % 2;
    address payable winner = participants[winnerIndex];

    console.log('\n\t---Before---');
    console.log(
      '\tAddress: %s \n\tBalance: %s ETH (%s WEI)',
      winner,
      winner.balance / 1 ether,
      winner.balance
    );

    console.log('\n\tPot Prize: %s ETH (%s WEI)', s_pot / 1 ether, s_pot);

    (bool success, ) = winner.call{value: s_pot}('');
    if (!success) {
      revert Arisan__TransferFailed();
    }
    status = ArisanStatus.OPEN;
    winnerHistory.push(winner);
    emit WinnerSelected(winner);

    s_pot = 0;

    console.log('\n\t---After---');
    console.log(
      '\tAddress: %s \n\tBalance: %s ETH (%s WEI)',
      winner,
      winner.balance / 1 ether,
      winner.balance
    );
  }

  function closeArisan() public onlyOrganizer {
    status = ArisanStatus.CLOSED;
  }

  function getParticipants() public view returns (address[] memory) {
    address[] memory m_participants = new address[](participants.length);
    for (uint256 i = 0; i < participants.length; i++) {
      m_participants[i] = participants[i];
    }
    return m_participants;
  }

  function getPaidParticipants() public view returns (address[] memory) {
    address[] memory m_paidParticipants = new address[](paidParticipants.length);
    for (uint256 i = 0; i < paidParticipants.length; i++) {
      m_paidParticipants[i] = participants[i];
    }
    return m_paidParticipants;
  }

  function getOrganizer() public view returns (address) {
    return i_organizer;
  }

  function getPaymentAmount() public view returns (uint256) {
    return i_paymentAmount;
  }

  function getStatus() public view returns (ArisanStatus) {
    return status;
  }

  function getWinnerHistory() public view returns (address[] memory) {
    address[] memory m_winnerHistory = new address[](winnerHistory.length);
    for (uint256 i = 0; i < winnerHistory.length; i++) {
      m_winnerHistory[i] = winnerHistory[i];
    }
    return m_winnerHistory;
  }

  function getWinnerCount() public view returns (uint256) {
    return winnerHistory.length;
  }

  function getMaxParticipants() public view returns (uint256) {
    return maxParticipants;
  }

  function getParticipantCount() public view returns (uint256) {
    return participants.length;
  }

  function getArisanPot() public view returns (uint256) {
    return s_pot;
  }

  modifier onlyOrganizer() {
    require(msg.sender == i_organizer, 'Only the organizer can call this function');
    _;
  }
}
