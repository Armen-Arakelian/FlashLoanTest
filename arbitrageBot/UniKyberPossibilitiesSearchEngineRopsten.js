const rp = require('request-promise');
const BigNumber = require('bignumber.js');

const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');

const ArbitrageContract = artifacts.require('ArbitrageFlashUniKyber');

const UniswapFactoryAddress = '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351';
const KyberNetworkProxyAddress = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';

const arbitrageContractAddress = '0x6f0fb79ed4e6b07ae33883fbfcb2990ceca2df75';

const toBN = (num) => {
  return new BigNumber(num);
};

const DECIMALS_18 = toBN(1000000000000000000);
const UNLIMITED_DEADLINE = toBN(9000000000);
const TRANSACTION_GAS = toBN(500000);

const validTokens = ['DAI', 'BAT', 'KNC', 'MANA', 'RDN'];

const tokenAddresses = {
  ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  KNC: '0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6',
  MANA: '0x72fd6C7C1397040A66F33C2ecC83A0F71Ee46D5c',
  BAT: '0xDb0040451F373949A4Be60dcd7b6B8D6E42658B6',
  RDN: '0x5422Ef695ED0B1213e2B953CFA877029637D9D26',
  DAI: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
};

const uniConfig = {
  baseUrl: 'https://api.uniswap.info/v1/',

  // token signature to exchange address
  exchanges: {
    DAI: '0xc0fc958f7108be4060F33a699a92d3ea49b0B5f0',
    KNC: '0x83f986f6c772d20dd9D00A71082236f0F2F9Ec61',
    MANA: '0xE0131804742D16f8ACBd1924044D6E63621e2A35',
    BAT: '0x8Bcd6f821012989b8d32EF002667a6524296A279',
    RDN: '0x0B517580E7D1761E06EE39a366D3D2bf3b308864',
  },
};

const kyberConfig = {
  baseUrl: 'https://ropsten-api.kyber.network/',
};

const getPriceEthToTokenUni = async (tokenSig, numberOfEth) => {
  const uniExchange = await UniswapExchange.at(uniConfig.exchanges[tokenSig]);
  const price = await uniExchange.getEthToTokenInputPrice.call(numberOfEth);

  return toBN(price);
};

const getPriceTokenToEthUni = async (tokenSig, numberOftokens) => {
  const uniExchange = await UniswapExchange.at(uniConfig.exchanges[tokenSig]);
  const price = await uniExchange.getTokenToEthInputPrice.call(numberOftokens);

  return toBN(price);
};

const getPriceEthToTokenKyber = async (tokenSig, numberOfEth) => {
  const kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyAddress);

  const rate = await kyberProxy.getExpectedRate.call(tokenAddresses.ETH,
    tokenAddresses[tokenSig], numberOfEth);

  return {
    pureRate: toBN(rate.expectedRate),
    wrappedRate: toBN((toBN(rate.expectedRate).div(DECIMALS_18)).times(numberOfEth)),
  };
};

const getPriceTokenToEthKyber = async (tokenSig, numberOfTokens) => {
  const kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyAddress);

  const rate = await kyberProxy.getExpectedRate.call(tokenAddresses[tokenSig],
    tokenAddresses.ETH, numberOfTokens);

  return {
    pureRate: toBN(rate.expectedRate),
    wrappedRate: toBN((toBN(rate.expectedRate).div(DECIMALS_18)).times(numberOfTokens)),
  };
};

const checkArbitragePossibilityForToken = async (tokenSig, gasPrice) => {
  topEthBorder = toBN(100000000000000000000000);
  botEthBorder = toBN(10000000000000000);
  const ethForGasFee = TRANSACTION_GAS.times(gasPrice);

  let i = 1;
  while (topEthBorder.div(i) > botEthBorder) {
    const ethAmount = topEthBorder.div(i);

    let uniRateEthToToken;
    let kyberRateEthToToken;
    try {
      uniRateEthToToken = await getPriceEthToTokenUni(tokenSig, ethAmount);
      kyberRateEthToToken = await getPriceEthToTokenKyber(tokenSig, ethAmount);
    } catch (err) {
      console.error('No volume for ' + tokenSig, ' with ' + ethAmount);
      i *= 10;
      continue;
    }

    let uniRateTokenToEth;
    let kyberRateTokenToEth;
    try {
      uniRateTokenToEth = await getPriceTokenToEthUni(tokenSig, kyberRateEthToToken.wrappedRate);
      kyberRateTokenToEth = await getPriceTokenToEthKyber(tokenSig, uniRateEthToToken);
    } catch (err) {
      console.error('No volume for ' + tokenSig, ' with ' + ethAmount);
      i *= 10;
      continue;
    }

    const priceDifferenceOneWay = kyberRateTokenToEth.wrappedRate;
    const priceDifferenceTheOtherWay = uniRateTokenToEth;

    const potentialProfitOneWay =
      ((toBN(priceDifferenceOneWay).minus(ethAmount)).minus(ethForGasFee)).decimalPlaces(0);
    const potentialProfitTheOtherWay =
      ((toBN(priceDifferenceTheOtherWay).minus(ethAmount)).minus(ethForGasFee)).decimalPlaces(0);

    console.log({
      token: tokenSig,
      ethAmount: ethAmount.toFixed(),
      priceDifference1: priceDifferenceOneWay.toFixed(),
      priceDifference2: priceDifferenceTheOtherWay.toFixed(),
      profit1: potentialProfitOneWay.toFixed(),
      profit2: potentialProfitTheOtherWay.toFixed(),
    });

    if (potentialProfitOneWay > 0) {
      console.log('Trading Uni to Kyber, token ' + tokenSig, ' start amount ' + ethAmount);
      console.log('Potentian profit is ' + potentialProfitOneWay);

      try {
        await performUniKyberTrade(tokenSig, ethAmount,
          uniRateEthToToken, kyberRateTokenToEth.pureRate);
      } catch (error) {
        console.log('Trade failed ');
        console.error(error);
      }
    } else if (potentialProfitTheOtherWay > 0) {
      console.log('Trading Kyber to Uni, token' + tokenSig, ' start amount ' + ethAmount);
      console.log('Potentian profit is ' + potentialProfitTheOtherWay);

      try {
        await performKyberUniTrade(tokenSig, ethAmount, kyberRateEthToToken.wrappedRate,
          uniRateTokenToEth, kyberRateEthToToken.pureRate);
      } catch (error) {
        console.log('Trade failed');
        console.error(error);
      }
    }

    i *= 10;
  }
};

const performUniKyberTrade = async (tokenSig, ethAmountToSell, tokensAmountToTrade, kyberRate) => {
  const arbitrageContract = await ArbitrageContract.at(arbitrageContractAddress);

  const logs = await arbitrageContract.flashUniETHToKyberTokens(uniConfig.exchanges[tokenSig],
    ethAmountToSell, tokensAmountToTrade, UNLIMITED_DEADLINE,
    tokenAddresses[tokenSig], tokensAmountToTrade, kyberRate);

  console.log(logs);
};

const performKyberUniTrade =
  async (tokenSig, ethAmountToSell, tokensAmountToTrade, ethAmountToBuy, kyberRate) => {
    const arbitrageContract = await ArbitrageContract.at(arbitrageContractAddress);

    const logs = await arbitrageContract.flashKyberETHToUniTokens(uniConfig.exchanges[tokenSig],
      ethAmountToSell, tokensAmountToTrade, ethAmountToBuy, 
      UNLIMITED_DEADLINE, tokenAddresses[tokenSig], kyberRate);

    console.log(logs);
  };


const checkForAllPossibilities = async () => {
  const gasPrice = await getGasPrice();

  for (let i = 0; i < validTokens.length; i++) {
    await checkArbitragePossibilityForToken(validTokens[i], gasPrice);
  }
};

const getGasPrice = async () => {
  const options = {
    url: 'https://ethgasstation.info/api/ethgasAPI.json',
    json: true,
  };

  const resultGas = await rp(options);

  return toBN(resultGas.average).times(100000000);
};

const getExchange = async (tokenSig) => {
  return await (await UniswapFactory.at(UniswapFactoryAddress))
  .getExchange.call(tokenAddresses[tokenSig]);
};

const runBot = async () => {
  await checkForAllPossibilities();
};

module.exports = async (callback) => {
  try {
    await runBot();
  } catch (error) {
    callback(error);
  }

  callback();
};

const withdrawETH = async () => {
  const arbitrageContract = await ArbitrageContract.at(arbitrageContractAddress);
  await arbitrageContract.withdrawETH();
};


