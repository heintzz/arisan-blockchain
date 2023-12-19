// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import './Arisan.sol';

error Arisan__UnauthorizedToDelete();

contract ArisanFactory {
  Arisan[] public arisans;

  event CreateArisan(address indexed organizer, uint256 paymentAmount);

  function createArisan(
    address _vrfCoordinatorV2,
    bytes32 _gasLane,
    uint64 _subscriptionId,
    uint32 _callbackGasLimit,
    uint256 _paymentAmount,
    uint256 _maxParticipants
  ) public {
    Arisan newArisan = new Arisan(
      msg.sender,
      _vrfCoordinatorV2,
      _gasLane,
      _subscriptionId,
      _callbackGasLimit,
      _paymentAmount,
      _maxParticipants
    );

    arisans.push(newArisan);

    emit CreateArisan(msg.sender, _paymentAmount);
  }

  function deleteArisan(uint256 _arisanId) public {
    if (arisans[_arisanId].getOrganizer() != msg.sender) {
      revert Arisan__UnauthorizedToDelete();
    }

    for (uint256 i = _arisanId; i < arisans.length - 1; i++) {
      arisans[i] = arisans[i + 1];
    }
    arisans.pop();
  }

  function getArisanById(uint256 _arisanId) public view returns (Arisan) {
    return arisans[_arisanId];
  }

  function getArisanCount() public view returns (uint256) {
    return arisans.length;
  }

  function getArisanList() public view returns (Arisan[] memory) {
    return arisans;
  }
}
