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
  address constant kyberNetworkProxyAddress = 0x818e6fecd516ecc3849daf6845e3ec868087b755; // ropsten

  constructor(LendingPoolAddressesProvider _provider)
      FlashLoanReceiverBase(_provider) public {
        provider = LendingPoolAddressesProvider(_provider);
        lendingPool = LendingPool(provider.getLendingPool());
  }

  function flashUniETHToKyberTokens(address _uniExchange, uint256 _min_tokens, uint256 _deadline, address _token, uint256 _srcAmount, uint256 _kyberRate) external onlyOwner() {
    address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address receiver = address(this);
    uint256 amount = 1000 * 1e14;

    bytes memory params = abi.encode(uint256(0), _uniExchange, _min_tokens, _deadline, kyberNetworkProxyAddress, _token, _srcAmount, _kyberRate);

    lendingPool.flashLoan(receiver, ethAddress, amount, params);
  }

  function flashKyberETHToUniTokens(address _uniExchange, uint256 _tokens_sold, uint256 _min_eth, uint256 _deadline, address _token, uint256 _kyberRate) external onlyOwner() {
    address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address receiver = address(this);
    uint256 amount = 1000 * 1e14;

    bytes memory params = abi.encode(uint256(1), _uniExchange, _tokens_sold, _min_eth, _deadline, kyberNetworkProxyAddress, _token, _kyberRate);

    lendingPool.flashLoan(receiver, ethAddress, amount, params);
  }

  function flashUniTokenToKyberETH(address _uniExchange, uint256 _min_tokens, uint256 _deadline, address _token, uint256 _srcAmount, uint256 _kyberRate) external onlyOwner() {
    address receiver = address(this);
    uint256 amount = 1000 * 1e14;

    bytes memory params = abi.encode(uint256(0), _uniExchange, _min_tokens, _deadline, kyberNetworkProxyAddress, _token, _srcAmount, _kyberRate);

    lendingPool.flashLoan(receiver, _token, amount, params);
  }

  function flashKyberTokenToUniETH(address _uniExchange, uint256 _tokens_sold, uint256 _min_eth, uint256 _deadline, address _token, uint256 _kyberRate) external onlyOwner() {
    address receiver = address(this);
    uint256 amount = 1000 * 1e14;

    bytes memory params = abi.encode(uint256(1), _uniExchange, _tokens_sold, _min_eth, _deadline, kyberNetworkProxyAddress, _token, _kyberRate);

    lendingPool.flashLoan(receiver, _token, amount, params);
  }

  function executeOperation(
      address _reserve,
      uint256 _amount,
      uint256 _fee,
      bytes calldata _params) external {

      //check the contract has the specified balance
      require(_amount <= getBalanceInternal(address(this), _reserve), 
          "Invalid balance for the contract");
      


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