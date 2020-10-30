const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');
const IERC20 = artifacts.require('IERC20');

const BigNumber = require('bignumber.js');

const toBN = (num) => {
  return new BigNumber(num);
};

contract('uniswap', async () => {
  let uniswapExchangeDai;
  let uniswapFactory;

  const UniswapFactoryAddress = '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351';
  const ropstenDaiAddress = '0xaD6D458402F60fD3Bd25163575031ACDce07538D';

  before('', async () => {
    uniswapFactory = await UniswapFactory.at(UniswapFactoryAddress);
    uniswapExchangeDai = await UniswapExchange.at(await uniswapFactory.getExchange(ropstenDaiAddress));
    ropstenDaiToken = await IERC20.at(ropstenDaiAddress);
  });

  it('Uniswap test', async () => {
    const result = await uniswapExchangeDai.getTokenToEthOutputPrice(toBN(1140000000000000000));
    console.log(result.toString());

    // const logs = await uniswapExchangeDai.ethToTokenSwapOutput(toBN(4000000000000000000), 1587131023, {value: toBN(10000000000000000)});

    // await ropstenDaiToken.approve(uniswapExchangeDai.address, toBN(5000000000000000000));
    // const logs = await uniswapExchangeDai.tokenToEthSwapOutput(toBN(10000000000000000), toBN(5000000000000000000), 2587131023);


    // await ropstenDaiToken.approve(uniswapExchangeDai.address, toBN(10000000000000000000));
    // const logs = await uniswapExchangeDai.addLiquidity(toBN(20000000000000000), toBN(8000000000000000000), 1587131023);

    // console.log(logs);
  });
});
