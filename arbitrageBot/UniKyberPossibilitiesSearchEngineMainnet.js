const rp = require('request-promise');
const BigNumber = require('bignumber.js');

const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');

const ArbitrageContract = artifacts.require('ArbitrageFlashUniKyber');

const UniswapFactoryAddress = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95';
const KyberNetworkProxyAddress = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';

const arbitrageContractAddress = '0x1e857482679a1B71ca15227DA1b14a58B5602DBF';

const toBN = (num) => {
  return new BigNumber(num);
};

const DECIMALS_18 = toBN(1000000000000000000);
const UNLIMITED_DEADLINE = 9000000000;
const TRANSACTION_GAS = toBN(500000);

const validTokensRopsten = ['KNC', 'MANA', 'BAT', 'RDN', 'DAI'];

const tokenAddresses= {
  ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  KNC: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
  MANA: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
  BAT: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
  RDN: '0x255aa6df07540cb5d3d297f0d0d4d84cb52bc8e6',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
};

const uniConfig = {
  baseUrl: 'https://api.uniswap.info/v1/',

  // token signature to exchange address
  exchanges: {
    DAI: '0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667',
    KNC: '0x49c4f9bc14884f6210F28342ceD592A633801a8b',
    MANA: '0xC6581Ce3A005e2801c1e0903281BBd318eC5B5C2',
    BAT: '0x2E642b8D59B45a1D8c5aEf716A84FF44ea665914',
    RDN: '0x7D03CeCb36820b4666F45E1b4cA2538724Db271C',
  },
};

const kyberConfig = {
  baseUrl: 'https://ropsten-api.kyber.network/',
};

const getJointTokensUniKyber = async () => {
  const optionsKyber = {
    url: kyberConfig.baseUrl + 'currencies',
    json: true,
  };

  const optionsUniswap = {
    url: uniConfig.baseUrl + 'assets',
    json: true,
  };

  const resultKyber = (await rp(optionsKyber)).data;
  const resultUni = Object.values(await rp(optionsUniswap));
  const kyberSyms = [];
  const uniSyms = [];

  resultKyber.forEach((element) => {
    kyberSyms.push(element.symbol);
  });

  resultUni.forEach((element) => {
    uniSyms.push(element.symbol);
  });

  const result = kyberSyms.filter(function(val) {
    return uniSyms.indexOf(val) != -1;
  });

  console.log(result);
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

  const rate = await kyberProxy.getExpectedRate.call(tokenAddresses.ETH, tokenAddresses[tokenSig], numberOfEth);

  return {
    pureRate: toBN(rate.expectedRate),
    wrappedRate: toBN((toBN(rate.expectedRate).div(DECIMALS_18)).times(numberOfEth)),
  };
};

const getPriceTokenToEthKyber = async (tokenSig, numberOfTokens) => {
  const kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyAddress);

  const rate = await kyberProxy.getExpectedRate.call(tokenAddresses[tokenSig], tokenAddresses.ETH, numberOfTokens);

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

    const potentialProfitOneWay = ((toBN(priceDifferenceOneWay).minus(ethAmount)).minus(ethForGasFee)).decimalPlaces(0);
    const potentialProfitTheOtherWay = ((toBN(priceDifferenceTheOtherWay).minus(ethAmount)).minus(ethForGasFee)).decimalPlaces(0);

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
        await performUniKyberTrade(tokenSig, ethAmount, uniRateEthToToken, kyberRateTokenToEth.pureRate);
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
    ethAmountToSell, tokensAmountToTrade, UNLIMITED_DEADLINE, tokenAddresses[tokenSig], tokensAmountToTrade, kyberRate);

  console.log(logs);
};

const performKyberUniTrade = async (tokenSig, ethAmountToSell, tokensAmountToTrade, ethAmountToBuy, kyberRate) => {
  const arbitrageContract = await ArbitrageContract.at(arbitrageContractAddress);

  const logs = await arbitrageContract.flashKyberETHToUniTokens(uniConfig.exchanges[tokenSig],
    ethAmountToSell, tokensAmountToTrade, ethAmountToBuy, UNLIMITED_DEADLINE, tokenAddresses[tokenSig], kyberRate);

  console.log(logs);
};


const checkForAllPossibilities = async () => {
  const gasPrice = await getGasPrice();

  for (let i = 0; i < validTokensRopsten.length; i++) {
    await checkArbitragePossibilityForToken(validTokensRopsten[i], gasPrice);
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
  return await (await UniswapFactory.at(UniswapFactoryAddress)).getExchange.call(tokenAddresses[tokenSig]);
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


