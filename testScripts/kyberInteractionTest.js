const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const KyberTest = artifacts.require('KyberIntegration');
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
  })

  it.only('get expectedRate()', async () => {
    const result = await kyberProxy.getExpectedRate.call(ETH_ADDRESS, ropstenDaiAddress, toBN(10000000000000000));
    console.log(result.expectedRate.toString());
    console.log(result.slippageRate.toString());
  })

  it('Kyber test change ETH to tokens', async () => {
    const result = await kyberProxy.getExpectedRate.call(ropstenDaiAddress, ETH_ADDRESS, toBN(100000000000000000));
    console.log(result.expectedRate.toString());

    const logs = await kybertest.kyberSwapEtherToToken(ropstenDaiAddress, result.expectedRate, {value: toBN(100000000000000000)});
    await kybertest.withdrawTokens(ropstenDaiAddress);
    console.log(logs);
  })

  it('Kyber test change tokens to ETH', async () => {
    const result = await kyberProxy.getExpectedRate.call(ETH_ADDRESS, ropstenTokenAddress, toBN(50000000000000000000));
    console.log(result.expectedRate.toString());

    await ropstenDaiToken.approve(kyberTestAddress, toBN(50000000000000000000));

    const logs = await kybertest.kyberSwapTokenToEther(ropstenTokenAddress, toBN(50000000000000000000), result.expectedRate);

    console.log(logs);

    await kybertest.withdrawETH();
  })

  it('Kyber test change token to token', async () => {
    const result = await kyberProxy.getExpectedRate.call(ropstenDaiAddress, ropstenTokenAddress, toBN(50000000000000000000));
    console.log(result.expectedRate.toString());

    const logs = await kybertest.executeKyberTokenSwap(ropstenTokenAddress, toBN(50000000000000000000), ropstenDaiAddress);

    console.log(logs);
  })

  it('deploy', async () => {
    await KyberTest.new(KyberNetworkProxyInterfaceAddress);
  });
})