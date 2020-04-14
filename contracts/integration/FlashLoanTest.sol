pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

import "../flashloan/base/FlashLoanReceiverBase.sol";
import "../configuration/LendingPoolAddressesProvider.sol";
import "../lendingpool/LendingPool.sol";

contract FlashLoanTest is FlashLoanReceiverBase, Ownable {

    using SafeMath for uint256;

    LendingPool lendingPool;
    LendingPoolAddressesProvider provider;
    address constant EtherollAddress = 0xA52e014B3f5Cc48287c2D483A3E026C32cc76E6d;

    event Succsess();

    constructor(LendingPoolAddressesProvider _provider)
        FlashLoanReceiverBase(_provider)
        public {
          provider = LendingPoolAddressesProvider(_provider);
          lendingPool = LendingPool(provider.getLendingPool());
        }

    function flashLoan() external onlyOwner() {
      address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
      address receiver = address(this);
      uint256 amount = 1000 * 1e14;
      bytes memory params = "";

      lendingPool.flashLoan(receiver, ethAddress, amount, params);
      emit Succsess();
    }

    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params) external {

        //check the contract has the specified balance
        require(_amount <= getBalanceInternal(address(this), _reserve), 
            "Invalid balance for the contract");

        /**
            CUSTOM ACTION TO PERFORM WITH THE BORROWED LIQUIDITY
            
            Example of decoding bytes param of type `address` and `uint`
            (address sampleAddress, uint sampleAmount) = abi.decode(_params, (address, uint));
        */

        transferFundsBackToPoolInternal(_reserve, _amount.add(_fee));
    }

    function () external payable {}
}