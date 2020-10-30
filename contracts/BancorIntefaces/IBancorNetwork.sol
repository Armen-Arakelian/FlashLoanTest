contract IBancorNetwork {
    // call when sending eth
    function convert(
        IERC20Token[] _path, 
        uint256 _amount, 
        uint256 _minReturn
    ) external returns(uint256 returnAmount);
    
    // call when sending tokens
    function claimAndConvert(
        IERC20Token[] _path,
        uint256 _amount, 
        uint256 _minReturn
    ) external returns(uint256 returnAmount);
}