contract IContractRegistry {
    function addressOf(bytes32 contractName) public view returns(address);    
}