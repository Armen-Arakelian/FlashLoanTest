pragma solidity ^0.5.9;

import "../UniswapInterfaces/UniswapExchangeInterface.sol";

contract UniswapIntegration {
  function swapEthToTokenInput(address _exchange, uint256 _min_tokens, uint256 _deadline) 
  internal returns(bool success) {
    UniswapExchangeInterface(_exchange).ethToTokenSwapInput.value(msg.value)(_min_tokens, _deadline);
  }

  function swapEthToTokenOutput(address _exchange, uint256 _tokens_bought, uint256 _deadline) 
  internal returns(bool success) {
    UniswapExchangeInterface(_exchange).ethToTokenSwapOutput.value(msg.value)(_tokens_bought, _deadline);
  }

  function swapTokenToEthInput(address _exchange, uint256 _tokens_sold, uint256 _min_eth, uint256 _deadline) 
  internal returns(bool success) {
    UniswapExchangeInterface(_exchange).approve(_exchange, 0);
    UniswapExchangeInterface(_exchange).approve(_exchange, _tokens_sold);

    UniswapExchangeInterface(_exchange).tokenToEthSwapInput(_tokens_sold, _min_eth, _deadline);
  }
}