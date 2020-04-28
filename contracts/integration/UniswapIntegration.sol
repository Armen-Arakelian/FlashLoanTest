pragma solidity ^0.5.9;

import "../UniswapInterfaces/UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UniswapIntegration {
  function uniSwapEthToTokenInput(address _exchange, uint256 _ethToSell, uint256 _min_tokens, uint256 _deadline) 
  internal returns(bool success) {
    UniswapExchangeInterface(_exchange).ethToTokenSwapInput.value(_ethToSell)(_min_tokens, _deadline);

    return true;
  }

  function uniSwapEthToTokenOutput(address _exchange, uint256 _ethToSell, uint256 _tokens_bought, uint256 _deadline) 
  internal returns(bool success) {
    UniswapExchangeInterface(_exchange).ethToTokenSwapOutput.value(_ethToSell)(_tokens_bought, _deadline);

    return true;
  }

  function uniSwapTokenToEthInput(address _exchange, uint256 _tokens_sold, 
    uint256 _min_eth, uint256 _deadline, address _token) 
  internal returns(bool success) {
    ERC20(_token).approve(_exchange, 0);
    ERC20(_token).approve(_exchange, _tokens_sold);

    UniswapExchangeInterface(_exchange).tokenToEthSwapInput(_tokens_sold, _min_eth, _deadline);

    return true;
  }

  function uniSwapTokenToEthOutput(address _exchange, uint256 _tokens_sold, 
    uint256 _eth_bought, uint256 _deadline, address _token) 
  internal returns(bool success) {
    ERC20(_token).approve(_exchange, 0);
    ERC20(_token).approve(_exchange, _tokens_sold);

    UniswapExchangeInterface(_exchange).tokenToEthSwapOutput(_eth_bought, _tokens_sold, _deadline);

    return true;
  }
}