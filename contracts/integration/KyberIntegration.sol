pragma solidity ^0.5.9;

import "../KyberInterfaces/KyberNetworkProxyInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract KyberIntegration {
  function executeKyberTokenSwap(address _kyberNetworkProxyAddress, address _srcToken, uint _srcQty, address _destToken) internal returns(bool success) {
    uint _minConversionRate;
    ERC20(_srcToken).approve(_kyberNetworkProxyAddress, 0);
    ERC20(_srcToken).approve(_kyberNetworkProxyAddress, _srcQty);

    (_minConversionRate,) = KyberNetworkProxyInterface(_kyberNetworkProxyAddress)
      .getExpectedRate(_destToken, _srcToken, _srcQty);

    KyberNetworkProxyInterface(_kyberNetworkProxyAddress).swapTokenToToken(_srcToken, _srcQty, _destToken, _minConversionRate);

    return true;
  }

  function kyberSwapEtherToToken(address _token, uint256 _kyberMinConversionRate) internal returns(bool success) {
    kyberNetworkProxyContract.swapEtherToToken.value(msg.value)(ERC20(_token), _kyberMinConversionRate);

    return true;
  }

  function kyberSwapTokenToEther(address _kyberNetworkProxyAddress, address _token, uint256 _srcAmount, uint256 _kyberMinConversionRate) internal returns(bool success) {
    ERC20(_token).approve(_kyberNetworkProxyAddress, 0);
    ERC20(_token).approve(_kyberNetworkProxyAddress, _srcAmount);
    
    KyberNetworkProxyInterface(_kyberNetworkProxyAddress).swapTokenToEther(_token, _srcAmount, _kyberMinConversionRate);

    return true;
  }
}