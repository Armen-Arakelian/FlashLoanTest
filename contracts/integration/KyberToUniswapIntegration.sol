pragma solidity ^0.5.9;

import "../KyberContracts/KyberNetworkProxyInterface.sol";
import "../KyberContracts/ERC20Interface.sol";

contract KyberToUniswapIntegration {
  KyberNetworkProxyInterface kyberNetworkProxyContract;

  constructor (address _kyberNetworkProxyAddress) public {
    kyberNetworkProxyContract = KyberNetworkProxyInterface(_kyberNetworkProxyAddress);
  }

  function getTokenRate(ERC20 _tokenSrc, ERC20 _tokenDst, uint256 _valueSrc) public returns (uint256, uint256) {
    return kyberNetworkProxyContract.getExpectedRate(_tokenSrc, _tokenDst, _valueSrc);
  }

  function executeTokenSwap(ERC20 srcToken, uint srcQty, ERC20 destToken, address destAddress, uint maxDestAmount) public {
    uint minConversionRate;

    require(srcToken.transferFrom(msg.sender, address(this), srcQty));

    require(srcToken.approve(address(kyberNetworkProxyContract), 0));

    require(srcToken.approve(address(kyberNetworkProxyContract), srcQty));

    (minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(srcToken, destToken, srcQty);

    kyberNetworkProxyContract.trade(srcToken, srcQty, destToken, destAddress, maxDestAmount, minConversionRate, 0);

    Swap(msg.sender, srcToken, destToken);
}
}