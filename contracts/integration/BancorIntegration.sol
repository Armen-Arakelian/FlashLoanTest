import "../bancorIntefaces/IBancorNetwork.sol";
import "../bancorIntefaces/IContractRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BancorIntegration {
  address constant contractRegistryAddress = 0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4;
  bytes32 constant contractName = 0x42616e636f724e6574776f726b; // "BancorNetwork"

  function trade(
    IERC20[] _path,
    uint256 _minReturn) 
  internal {
    IContractRegistry contractRegistry = IContractRegistry(contractRegistryAddress);
    address bancorNetworkAddress = IContractRegistry.addressOf(contractName);
    IBancorNetwork bancorNetwork = IBancorNetwork(bancorNetworkAddress);
    
    bancorNetwork.convert(_path, msg.value, _minReturn);
  }

  function tradeToken(
    IERC20Token[] _path,
    uint256 _amount, 
    uint256 _minReturn) 
  internal {
    IContractRegistry contractRegistry = IContractRegistry(contractRegistryAddress);
    address bancorNetworkAddress = IContractRegistry.addressOf(contractName);
    IBancorNetwork bancorNetwork = IBancorNetwork(bancorNetworkAddress);
    
    bancorNetwork.convert(_path, _amount, _minReturn);
  } 
}