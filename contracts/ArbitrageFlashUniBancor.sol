pragma solidity ^0.5.5;

import "./integration/BancorIntegration.sol";
import "./integration/UniswapIntegration.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./aaveContracts/flashloan/base/FlashLoanReceiverBase.sol";
import "./aaveContracts/configuration/LendingPoolAddressesProvider.sol";
import "./aaveContracts/lendingpool/LendingPool.sol";

contract ArbitrageFlashUniKyber is Ownable, FlashLoanReceiverBase, BancorIntegration, UniswapIntegration {
  using SafeMath for uint256;

  LendingPool lendingPool;
  LendingPoolAddressesProvider provider;

  constructor(LendingPoolAddressesProvider _provider)
    FlashLoanReceiverBase(_provider) public {
      provider = LendingPoolAddressesProvider(_provider);
      lendingPool = LendingPool(provider.getLendingPool());
  }

  function flashUniToBancor(address _uniExchange, uint256 _ethToSell, uint256 _min_tokens, 
    uint256 _deadline, address[] _bancorPath, uint256 _ethToGet) 
  external onlyOwner() {
    address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address receiver = address(this);

    bytes memory params = abi.encode(true, _uniExchange, _ethToSell, _min_tokens, 
      _deadline, _bancorPath, _ethToGet);

    lendingPool.flashLoan(receiver, ethAddress, _ethToSell, params);
  }

  function flashBancorToUni(address _uniExchange, uint256 _ethToSell, uint256 _tokens_sold, uint256 _ethToGet, 
    uint256 _deadline, address[] _bancorPath) 
  external onlyOwner() {
    address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address receiver = address(this);

    bytes memory params = abi.encode(false, _uniExchange, _ethToSell, _tokens_sold, _min_eth, 
      _deadline, _bancorPath, _ethToGet);

    lendingPool.flashLoan(receiver, ethAddress, _ethToSell, params);
  }

  function executeOperation(
      address _reserve,
      uint256 _amount,
      uint256 _fee,
      bytes calldata _params) external {

      //check the contract has the specified balance
      require(_amount <= getBalanceInternal(address(this), _reserve), 
          "Invalid balance for the contract");
      
      (uint256 _arbitrageTypeIdentifier, ) = abi.decode(_params, (uint256, address));

      if (_arbitrageTypeIdentifier) {
        (, address _uniExchange, uint256 _ethToSell, uint256 _min_tokens, 
          uint256 _deadline, address[] _bancorPath, uint256 _ethToGet) = 
            abi.decode(_params, (uint256, address, uint256, uint256, uint256, address[], uint256));
        
        require(uniSwapEthToTokenInput(_uniExchange, _ethToSell, _min_tokens, _deadline), 
          'Failed to swap eth to tokens at Uniswap');

        require(bancorSwapTokentoETH(_bancorPath, _min_tokens, _ethToGet),
          'Failed to swap tokens to eth at Kyber');

      } else {
        (, address _uniExchange, uint256 _ethToSell, uint256 _tokens_sold, uint256 _ethToGet, 
          uint256 _deadline, address[] _bancorPath) = 
            abi.decode(_params, (uint256, address, uint256, uint256, uint256, uint256, address[]));

        require(bancorSwapETHtoToken.value(_ethToSell)(_bancorPath, _tokens_sold),
          'Failed to swap eth to tokens at Kyber');

        require(uniSwapTokenToEthOutput(_uniExchange, _tokens_sold, _min_eth, _deadline, _token),
          'Failed to swap tokens to eth at Uniswap');
      } 

      transferFundsBackToPoolInternal(_reserve, _amount.add(_fee));
  }

  function withdrawTokens(address _token) public onlyOwner {
    ERC20(_token).transfer(msg.sender, ERC20(_token).balanceOf(address(this)));
  }

  function withdrawETH() public onlyOwner {
    (msg.sender).transfer(address(this).balance);
  }

  function () external payable {}
}