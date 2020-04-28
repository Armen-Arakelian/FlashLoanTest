const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');

const BigNumber = require('bignumber.js');

const toBN = (num) => {
  return new BigNumber(num);
};

contract('KyberNetworkProxy', async (accounts) => {
  let kyberProxy;
  let uniswapExchange;
  let uniswapFactory;

  const UniswapFactoryAddress = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95';
  const KyberNetworkProxyInterfaceAddress = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';
  const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  const tokenAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';

  const ONE_ETH_IN_WEI = toBN(1000000000000000000);

  before('', async () => {
    kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyInterfaceAddress);
    uniswapFactory = await UniswapFactory.at(UniswapFactoryAddress);
    uniswapExchange = await UniswapExchange.at(await uniswapFactory.getExchange(tokenAddress));
  })

  it.only('get price Uni ETH to Kyber tokens', async () => {
    const ethToSell = toBN(10000000000000000000);

    const tokensBought = await uniswapExchange.getEthToTokenInputPrice.call(ethToSell);
    const kyberRate = (await kyberProxy.getExpectedRate.call(tokenAddress, ETH_ADDRESS, tokensBought)).expectedRate;
    const ethBoughtBack = (toBN(tokensBought).div(ONE_ETH_IN_WEI)).times(kyberRate);
    
    console.log(ethToSell.toString(), ' eth to sell at uni');
    console.log(kyberRate.toString(), ' kyber rate');
    console.log(tokensBought.toString(), ' number of tokens bought at kyber');
    console.log(ethBoughtBack.toString(), ' Eth bought back at uni');
  })

  it.only('get price Kyber ETH to Uni tokens', async () => {
    const ethToSell = toBN(10000000000000000000);

    const kyberRate = (await kyberProxy.getExpectedRate.call(ETH_ADDRESS, tokenAddress, ethToSell)).expectedRate;
    const tokensBought = ethToSell.div(ONE_ETH_IN_WEI).times(kyberRate);
    const ethBoughtBack = await uniswapExchange.getTokenToEthInputPrice.call(tokensBought);
    
    console.log(ethToSell.toString(), ' eth to sell at kyber');
    console.log(kyberRate.toString(), ' kyber rate');
    console.log(tokensBought.toString(), ' number of tokens bought at kyber');
    console.log(ethBoughtBack.toString(), ' Eth bought back at uni');
  })
})