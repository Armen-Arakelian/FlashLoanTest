pragma solidity ^0.5.5;

import "./integration/KyberIntegration.sol";
import "./integration/UniswapIntegration.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./aaveContracts/flashloan/base/FlashLoanReceiverBase.sol";
import "./aaveContracts/configuration/LendingPoolAddressesProvider.sol";
import "./aaveContracts/lendingpool/LendingPool.sol";

contract ArbitrageFlashUniKyber is Ownable, FlashLoanReceiverBase, KyberIntegration, UniswapIntegration{
  using SafeMath for uint256;

  LendingPool lendingPool;
  LendingPoolAddressesProvider provider;
  address constant kyberNetworkProxyAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755; // ropsten

  constructor(LendingPoolAddressesProvider _provider)
      FlashLoanReceiverBase(_provider) public {
        provider = LendingPoolAddressesProvider(_provider);
        lendingPool = LendingPool(provider.getLendingPool());
  }

  function flashUniETHToKyberTokens(address _uniExchange, uint256 _ethToSell, uint256 _min_tokens, 
    uint256 _deadline, address _token, uint256 _srcAmount, uint256 _kyberRate) 
  external onlyOwner() {
    address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address receiver = address(this);

    bytes memory params = abi.encode(uint256(0), _uniExchange, _ethToSell, _min_tokens, 
      _deadline, _token, _srcAmount, _kyberRate);

    lendingPool.flashLoan(receiver, ethAddress, _ethToSell, params);
  }

  function flashKyberETHToUniTokens(address _uniExchange, uint256 _ethToSell, uint256 _tokens_sold, uint256 _min_eth, 
    uint256 _deadline, address _token, uint256 _kyberRate) 
  external onlyOwner() {
    address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address receiver = address(this);

    bytes memory params = abi.encode(uint256(1), _uniExchange, _ethToSell, _tokens_sold, _min_eth, 
      _deadline, _token, _kyberRate);

    lendingPool.flashLoan(receiver, ethAddress, _ethToSell, params);
  }

  function flashUniTokenToKyberETH(address _uniExchange, uint256 _tokensToSell, uint256 _eth_sold, 
    uint256 _min_eth, uint256 _deadline, address _token, uint256 _kyberRate)
  external onlyOwner() {
    address receiver = address(this);

    bytes memory params = abi.encode(uint256(2), _uniExchange, _tokensToSell, _eth_sold, _min_eth, 
      _deadline, _token, _kyberRate);

    lendingPool.flashLoan(receiver, _token, _tokensToSell, params);
  }

  function flashKyberTokenToUniETH(address _uniExchange, uint256 _tokensToSell, 
    uint256 _min_tokens, uint256 _eth_sold, uint256 _deadline, address _token, uint256 _kyberRate)
  external onlyOwner() {
    address receiver = address(this);

    bytes memory params = abi.encode(uint256(0), _uniExchange, _tokensToSell, _min_tokens, 
      _deadline, _token, _kyberRate);
    
    lendingPool.flashLoan(receiver, _token, _tokensToSell, params);
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

      if (_arbitrageTypeIdentifier == 0) {
        (, address _uniExchange, uint256 _ethToSell, uint256 _min_tokens, uint256 _deadline, 
          address _token, uint256 _srcAmount, uint256 _kyberRate) = 
            abi.decode(_params, (uint256, address, uint256, uint256, uint256, address, uint256, uint256));
        
        require(uniSwapEthToTokenInput(_uniExchange, _ethToSell, _min_tokens, _deadline), 
          'Failed to swap eth to tokens at Uniswap');

        require(kyberSwapTokenToEther(kyberNetworkProxyAddress, _token, _srcAmount, _kyberRate),
          'Failed to swap tokens to eth at Kyber');

      } else if (_arbitrageTypeIdentifier == 1) {
        (, address _uniExchange, uint256 _ethToSell, uint256 _tokens_sold, uint256 _min_eth, 
          uint256 _deadline, address _token, uint256 _kyberRate) = 
            abi.decode(_params, (uint256, address, uint256, uint256, uint256, uint256, address, uint256));

        require(kyberSwapEtherToToken(kyberNetworkProxyAddress, _ethToSell, _token, _kyberRate),
          'Failed to swap eth to tokens at Kyber');

        require(uniSwapTokenToEthOutput(_uniExchange, _tokens_sold, _min_eth, _deadline, _token),
          'Failed to swap tokens to eth at Uniswap');

      } else if (_arbitrageTypeIdentifier == 2) {
        (, address _uniExchange, uint256 _tokensToSell, uint256 _eth_sold, uint256 _min_eth, 
          uint256 _deadline, address _token, uint256 _kyberRate) = 
            abi.decode(_params,  (uint256, address, uint256, uint256, uint256, uint256, address, uint256));

        require(uniSwapTokenToEthOutput(_uniExchange, _tokensToSell, _min_eth, _deadline, _token),
          'Failed to swap tokens to eth at Uniswap');

        require(kyberSwapEtherToToken(kyberNetworkProxyAddress, _eth_sold, _token, _kyberRate),
          'Failed to swap eth to tokens at Kyber');

      } else if (_arbitrageTypeIdentifier == 3) {
        (, address _uniExchange, uint256 _tokensToSell, uint256 _min_tokens, uint256 _eth_sold, uint256 _deadline, 
          address _token, uint256 _kyberRate) = 
            abi.decode(_params, (uint256, address, uint256, uint256, uint256, uint256, address, uint256));
        
        require(kyberSwapTokenToEther(kyberNetworkProxyAddress, _token, _tokensToSell, _kyberRate),
          'Failed to swap tokens to eth at Kyber');

        require(uniSwapEthToTokenInput(_uniExchange, _eth_sold, _min_tokens, _deadline), 
          'Failed to swap eth to tokens at Uniswap');
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

  // test 

  function kyberSwapEtherToTokenPublic(uint256 _ethToSell, 
    address _token, uint256 _kyberMinConversionRate) 
  public {
    kyberSwapEtherToToken(kyberNetworkProxyAddress, _ethToSell, _token, _kyberMinConversionRate);
  }

  function uniSwapTokenToEthInputPublic(address _exchange, uint256 _tokens_sold, 
    uint256 _min_eth, uint256 _deadline, address _token) 
  public {
    uniSwapTokenToEthInput(_exchange, _tokens_sold, _min_eth, _deadline, _token);
  }
}