const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const KyberTest = artifacts.require('KyberIntegration');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');
const ERC20Interface = artifacts.require('IERC20');
const BigNumber = require('bignumber.js');

const toBN = (num) => {
  return new BigNumber(num);
};

contract('KyberNetworkProxy', async () => {
  let kyberProxy;
  let kybertest;
  let ropstenToken;
  let ropstenDaiToken;
  let uniswapExchangeDai;
  let uniswapFactory;

  const UniswapFactoryAddress = '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351';

  const KyberNetworkProxyInterfaceAddress = '0x818e6fecd516ecc3849daf6845e3ec868087b755';
  const kyberTestAddress = '0xf386d2ff4294ff63eb96b87c4ac51571cf3298f8';
  const ropstenDaiAddress = '0xaD6D458402F60fD3Bd25163575031ACDce07538D';
  const ropstenTokenAddress = '0xaD78AFbbE48bA7B670fbC54c65708cbc17450167';
  const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  before('', async () => {
    kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyInterfaceAddress);
    kybertest = await KyberTest.at(kyberTestAddress);
    ropstenDaiToken = await ERC20Interface.at(ropstenDaiAddress);
    ropstenToken = await ERC20Interface.at(ropstenTokenAddress);
    uniswapFactory = await UniswapFactory.at(UniswapFactoryAddress);
    uniswapExchangeDai = await UniswapExchange.at(await uniswapFactory.getExchange(ropstenDaiAddress));
  })

  it.only('Kyber test change ETH to tokens', async () => {
    const result = await kyberProxy.getExpectedRate.call(ropstenDaiAddress, ETH_ADDRESS, toBN(1000000000000000000));
    console.log(result.expectedRate.toString());

    const logs = await kybertest.kyberSwapEtherToToken(ropstenDaiAddress, result.expectedRate, {value: toBN(1000000000000000000)});
    await kybertest.withdrawTokens(ropstenDaiAddress);
    console.log(logs);

    await ropstenDaiToken.approve(uniswapExchangeDai.address, toBN(600000000000000000000));
    const logs1 = await uniswapExchangeDai.tokenToEthSwapOutput(toBN(1140000000000000000), toBN(600000000000000000000), 2587131023);

    console.log(logs1);
  })

})