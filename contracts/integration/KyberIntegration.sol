pragma solidity ^0.5.9;

import "../KyberInterfaces/KyberNetworkProxyInterface.sol";
import "../KyberInterfaces/ERC20Interface.sol";

contract KyberIntegration {
  KyberNetworkProxyInterface kyberNetworkProxyContract;

  constructor (address _kyberNetworkProxyAddress) public {
    kyberNetworkProxyContract = KyberNetworkProxyInterface(_kyberNetworkProxyAddress);
  }

  function getTokenRate(ERC20 _tokenSrc, ERC20 _tokenDst, uint256 _valueSrc) public returns (uint256, uint256) {
    return kyberNetworkProxyContract.getExpectedRate(_tokenSrc, _tokenDst, _valueSrc);
  }

  function executeKyberTokenSwap(ERC20 _srcToken, uint _srcQty, ERC20 _destToken) public returns(bool success) {
    uint _minConversionRate;

    require(_srcToken.transferFrom(msg.sender, address(this), _srcQty), 'transferFrom failed');

    require(_srcToken.approve(address(kyberNetworkProxyContract), 0), 'appvoved failed');
    require(_srcToken.approve(address(kyberNetworkProxyContract), _srcQty), 'appvove failed');

    (_minConversionRate,) = kyberNetworkProxyContract.getExpectedRate(_destToken, _srcToken, _srcQty);

    kyberNetworkProxyContract.swapTokenToToken(_srcToken, _srcQty, _destToken, _minConversionRate);

    return true;
  }

  function kyberSwapEtherToToken(ERC20 _token, uint256 _kyberMinConversionRate) public payable returns(bool success) {
    kyberNetworkProxyContract.swapEtherToToken.value(msg.value)(ERC20(_token), _kyberMinConversionRate);
  }

  function kyberSwapTokenToEther(ERC20 _token, uint256 _srcAmount, uint256 _kyberMinConversionRate) public returns(bool success) {
    require(_token.transferFrom(msg.sender, address(this), _srcAmount), 'Cannot transfer tokens from user to contract');

    require(_token.approve(address(kyberNetworkProxyContract), 0), 'Cannot set allowance');
    require(_token.approve(address(kyberNetworkProxyContract), _srcAmount), 'Cannot set allowance');
    
    kyberNetworkProxyContract.swapTokenToEther(_token, _srcAmount, _kyberMinConversionRate);
  }

  function withdrawTokens(address _token) public {
    ERC20(_token).transfer(msg.sender, ERC20(_token).balanceOf(address(this)));
  }

  function withdrawETH() public {
    (msg.sender).transfer(address(this).balance);
  }
}