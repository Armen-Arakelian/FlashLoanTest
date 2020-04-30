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
const UNLIMITED_DEADLINE = 9000000000;
const TRANSACTION_GAS = toBN(500000);

const tokenAddresses = {
  ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  KNC: '',
  SNT: '',
  MANA: '',
  BAT: '',
  RDN: '',
  SALT: '',
  RCN: '',
  DAI: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
  LINK: '',
  WETH: '',
  SNX: '',
  TKN: '',
  MET: '',
  BAND: '',
  RSR: '',
  TRYB: '',
  PNK: '',
}

const uniConfig = {
  baseUrl: 'https://api.uniswap.info/v1/',

  // token address to exchange address
  exchanges: {
    '0xaD6D458402F60fD3Bd25163575031ACDce07538D': '0xc0fc958f7108be4060F33a699a92d3ea49b0B5f0',
    '': '',
    '': '',
    '': '',
    '': '',
    '': '',
    '': '',
    '': '',
    '': '',
  },
};

const kyberConfig = {
  baseUrl: 'https://ropsten-api.kyber.network/',
}

const getJointTokensUniKyber = async () => {
  const optionsKyber = {
    url: kyberConfig.baseUrl + 'currencies',
    json: true
  };

  const optionsUniswap = {
    url: uniConfig.baseUrl + 'assets',
    json: true
  };

  const resultKyber = (await rp(optionsKyber)).data;
  const resultUni = Object.values(await rp(optionsUniswap));
  let kyberSyms = [];
  let uniSyms = [];

  resultKyber.forEach(element => {
    kyberSyms.push(element.symbol);
  });

  resultUni.forEach(element => {
    uniSyms.push(element.symbol);
  });

  let result = kyberSyms.filter(function(val) {
    return uniSyms.indexOf(val) != -1;
  });
  
  console.log(result);
}

const getPriceEthToTokenUni = async (tokenSig, numberOfEth) => {
  const uniExchange = await UniswapExchange.at(uniConfig.exchanges[tokenAddresses[tokenSig]]);
  const price = await uniExchange.getEthToTokenInputPrice.call(numberOfEth);

  return price;
}

const getPriceTokenToEthUni = async (tokenSig, numberOftokens) => {
  const uniExchange = await UniswapExchange.at(uniConfig.exchanges[tokenAddresses[tokenSig]]);
  const price = await uniExchange.getTokenToEthInputPrice.call(numberOftokens);

  return price;
}

const getPriceEthToTokenKyber = async (tokenSig, numberOfEth) => {
  const kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyAddress);

  const rate = await kyberProxy.getExpectedRate.call(tokenAddresses.ETH, tokenAddresses[tokenSig], numberOfEth);

  return {
    pureRate: toBN(rate.expectedRate),
    wrappedRate: toBN((toBN(rate.expectedRate).div(DECIMALS_18)).times(numberOfEth)),
  };
}

const getPriceTokenToEthKyber = async (tokenSig, numberOfTokens) => {
  const kyberProxy = await IKyberNetworkProxy.at(KyberNetworkProxyAddress);

  const rate = await kyberProxy.getExpectedRate.call(tokenAddresses[tokenSig], tokenAddresses.ETH, numberOfTokens);

  return {
    pureRate: toBN(rate.expectedRate),
    wrappedRate: toBN((toBN(rate.expectedRate).div(DECIMALS_18)).times(numberOfTokens)),
  };
}

const checkArbitragePossibilityForToken = async (tokenSig, gasPrice) => {
  topEthBorder = toBN(100000000000000000000000);
  botEthBorder = toBN(10000000000000000);
  const ethForGasFee = TRANSACTION_GAS.times(gasPrice);

  let i = 1;
  while(topEthBorder.div(i) > botEthBorder) {
    const ethAmount = topEthBorder.div(i);

    const uniRateEthToToken = await getPriceEthToTokenUni(tokenSig, ethAmount);
    const kyberRateEthToToken = await getPriceEthToTokenKyber(tokenSig, ethAmount);

    console.log(kyberRateEthToToken.wrappedRate);

    const uniRateTokenToEth = await getPriceTokenToEthUni(tokenSig, kyberRateEthToToken.wrappedRate);
    const kyberRateTokenToEth = (await getPriceTokenToEthKyber(tokenSig, uniRateEthToToken));

    const priceDifferenceOneWay = kyberRateTokenToEth.wrappedRate;
    const priceDifferenceTheOtherWay = uniRateTokenToEth;

    const potentialProfitOneWay = (toBN(priceDifferenceOneWay).minus(ethAmount)).minus(ethForGasFee);
    const potentialProfitTheOtherWay = (toBN(priceDifferenceTheOtherWay).minus(ethAmount)).minus(ethForGasFee);

    if (potentialProfitOneWay > 0) {
      console.log('Trading Uni to Kyber, token' + tokenSig, ' start amount ' + ethAmount);
      console.log('Potentian profit is ' + potentialProfitOneWay);

      try {
        await performUniKyberTrade(tokenSig, ethAmount, uniRateEthToToken, kyberRateTokenToEth.pureRate);
      }
      catch(error) {
        console.log('Trade failed ');
        console.error(error);
      }
    } else if (potentialProfitTheOtherWay > 0) {
      console.log('Trading Kyber to Uni, token' + tokenSig, ' start amount ' + ethAmount);
      console.log('Potentian profit is ' + potentialProfitTheOtherWay);

      try {
        await performKyberUniTrade(tokenSig, ethAmount, kyberRateEthToToken.wrappedRate, 
          uniRateTokenToEth, kyberRateEthToToken.pureRate);
      }
      catch(error) {
        console.log('Trade failed');
        console.error(error);
      }
    }

    i *= 10;
  }
}

const performUniKyberTrade = async (tokenSig, ethAmountToSell, tokensAmountToTrade, kyberRate) => {
  const arbitrageContract = await ArbitrageContract.at(arbitrageContractAddress);

  const logs = await arbitrageContract.flashUniETHToKyberTokens(uniConfig.exchanges[tokenSig], 
    ethAmountToSell, tokensAmountToTrade, UNLIMITED_DEADLINE, tokenAddresses[tokenSig], tokensAmountToTrade, kyberRate);

  console.log(logs);
}

const performKyberUniTrade = async (tokenSig, ethAmountToSell, tokensAmountToTrade, ethAmountToBuy, kyberRate) => {
  const arbitrageContract = await ArbitrageContract.at(arbitrageContractAddress);

  const logs = arbitrageContract.flashKyberETHToUniTokens(uniConfig.exchanges[tokenSig], 
    ethAmountToSell, tokensAmountToTrade, ethAmountToBuy, UNLIMITED_DEADLINE, tokenAddresses[tokenSig], kyberRate);

  console.log(logs);
}


const checkForAllPossibilities = async () => {
  
  array.forEach(element => {
    
  });
  checkArbitragePossibilityForToken(arbitrageContract, 'DAI', )
  //
}

const getGasPrice = async () => {
  const options = {
    url: 'https://ethgasstation.info/api/ethgasAPI.json',
    json: true,
  }

  const resultGas = await rp(options);

  return toBN(resultGas.average).times(100000000);
}

const getExchange = async (tokenSig) => {
  return await (await UniswapFactory.at(UniswapFactoryAddress)).getExchange.call(tokenAddresses[tokenSig]);
}

const runBot = async () => {
  await checkArbitragePossibilityForToken('DAI', await getGasPrice());
}

module.exports = async (callback) => {
  //console.log(await getPriceTokenToEthUni('DAI', 10));
  try {
    await runBot();
  }
  catch(error) {
    callback(error);
  }
  
  callback();
}


