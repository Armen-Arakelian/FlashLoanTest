const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const BigNumber = require('bignumber.js');

const toBN = (num) => {
  return new BigNumber(num);
};

contract('KyberNetworkProxy', async () => {
  let kyberProxy;
  const KyberNetworkProxyInterfaceAddress = '0x818e6fecd516ecc3849daf6845e3ec868087b755';
  const ropstenDaiAddress = '0xaD6D458402F60fD3Bd25163575031ACDce07538D';
  const porstenTokenAddress = '0xaD78AFbbE48bA7B670fbC54c65708cbc17450167';
  const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  before('', async () => {
    kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyInterfaceAddress);
  })

  it('get maxGas()', async () => {
    console.log((await kyberProxy.maxGasPrice.call()).toString());
    const result = await kyberProxy.getExpectedRate.call(ETH_ADDRESS, ropstenDaiAddress, toBN(100000000000000000000));
    console.log(result.expectedRate.toString());
    console.log(result.slippageRate.toString());

    const logs = await kyberProxy.swapEtherToToken(ropstenDaiAddress, result.expectedRate, {value: new BigNumber(100000)});

    console.log(logs);
  })
})