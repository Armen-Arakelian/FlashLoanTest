pragma solidity ^0.5.9;

import "../KyberContracts/KyberNetworkProxyInterface.sol";

contract Arbitrage {
  KyberNetworkProxyInterface kyberNetworkProxyAddress;

  constructor (address _kyberNetworkProxyAddress) {
    kyberNetworkProxyAddress = KyberNetworkProxyInterface(_kyberNetworkProxyAddress);
  }

  function getTokenRate(address _tokenSrc, address _tokenDst, uint256 _valueSrc) public {
    return kyberNetworkProxyAddress.getExpectedRate(_tokenSrc, _tokenDst, _valueSrc);
  }
}