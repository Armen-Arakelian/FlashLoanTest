const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const KyberTest = artifacts.require('KyberIntegration');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');
const ERC20Interface = artifacts.require('IERC20');

const ArbitrageFlashUniKyber = artifacts.require('ArbitrageFlashUniKyber');

const BigNumber = require('bignumber.js');

const toBN = (num) => {
  return new BigNumber(num);
};

contract('KyberNetworkProxy', async (accounts) => {
  let kyberProxy;
  let kybertest;
  let ropstenToken;
  let ropstenDaiToken;
  let uniswapExchangeDai;
  let uniswapFactory;
  let arbitrageFlashUniKyber;

  const OWNER = accounts[0];

  const UniswapFactoryAddress = '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351';
  const KyberNetworkProxyInterfaceAddress = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';
  const kyberTestAddress = '0xf386d2ff4294ff63eb96b87c4ac51571cf3298f8';
  const ropstenDaiAddress = '0xaD6D458402F60fD3Bd25163575031ACDce07538D';
  const ropstenTokenAddress = '0xaD78AFbbE48bA7B670fbC54c65708cbc17450167';
  const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const lendingPoolAddressProvider = '0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728';

  const arbitrageFlashUniKyberAddress = '0x6f0fb79ed4e6b07ae33883fbfcb2990ceca2df75';

  const ONE_ETH_IN_WEI = toBN(1000000000000000000);

  

  before('', async () => {
    kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyInterfaceAddress);
    kybertest = await KyberTest.at(kyberTestAddress);
    ropstenDaiToken = await ERC20Interface.at(ropstenDaiAddress);
    ropstenToken = await ERC20Interface.at(ropstenTokenAddress);
    uniswapFactory = await UniswapFactory.at(UniswapFactoryAddress);
    uniswapExchangeDai = await UniswapExchange.at(await uniswapFactory.getExchange(ropstenDaiAddress));
    arbitrageFlashUniKyber = await ArbitrageFlashUniKyber.at(arbitrageFlashUniKyberAddress);
  })

  it('get price Uni ETH to Kyber tokens', async () => {
    const ethToSell = toBN(10000000000000000);

    const tokensBought = await uniswapExchangeDai.getEthToTokenInputPrice.call(ethToSell);
    const kyberRate = (await kyberProxy.getExpectedRate.call(ropstenDaiAddress, ETH_ADDRESS, tokensBought)).expectedRate;
    const ethBoughtBack = (toBN(tokensBought).div(ONE_ETH_IN_WEI)).times(kyberRate);
    
    console.log(ethToSell.toString(), ' eth to sell at kyber');
    console.log(kyberRate.toString(), ' kyber rate');
    console.log(tokensBought.toString(), ' number of tokens bought at kyber');
    console.log(ethBoughtBack.toString(), ' Eth bought back at uni');
  })

  it('get price Kyber ETH to Uni tokens', async () => {
    const ethToSell = toBN(1000000000000000);

    const kyberRate = (await kyberProxy.getExpectedRate.call(ETH_ADDRESS, ropstenDaiAddress, ethToSell)).expectedRate;
    const tokensBought = ethToSell.div(ONE_ETH_IN_WEI).times(kyberRate);
    const ethBoughtBack = await uniswapExchangeDai.getTokenToEthInputPrice.call(tokensBought);
    
    console.log(ethToSell.toString(), ' eth to sell at kyber');
    console.log(kyberRate.toString(), ' kyber rate');
    console.log(tokensBought.toString(), ' number of tokens bought at kyber');
    console.log(ethBoughtBack.toString(), ' Eth bought back at uni');
  })

  it.only('arbitrage with flashloan test', async () => {
    const result = await arbitrageFlashUniKyber.flashKyberETHToUniTokens(uniswapExchangeDai.address, toBN(1000000000000000000), 
      toBN(581750834000000000000), toBN(1033931583767551261), 
      toBN(2587566850), ropstenDaiAddress, toBN(581750834000000000000));

    console.log(result);
  })

  it('deploy arbitrageUniKyber', async () => {
    const logs = await ArbitrageFlashUniKyber.new(lendingPoolAddressProvider);
    console.log(logs);
  })

  it('test', async () => {
    // console.log((await uniswapExchangeDai.getEthToTokenInputPrice(toBN(10000000000000000000))).toString());
    // console.log((await kyberProxy.getExpectedRate.call(ropstenDaiAddress, ETH_ADDRESS, toBN(2993088952036762490049))).expectedRate.toString())

    //  console.log((await kyberProxy.getExpectedRate.call(ETH_ADDRESS, ropstenDaiAddress, toBN(1000000000000000000))).expectedRate.toString());
    //  console.log((await kyberProxy.getExpectedRate.call(ropstenDaiAddress, ETH_ADDRESS, toBN(10000000000000000000))).expectedRate.toString());

    console.log((toBN(1).minus(toBN(2))).toString());
  })

})