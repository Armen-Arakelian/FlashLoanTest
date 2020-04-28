const rp = require('request-promise');
const BigNumber = require('bignumber.js');

const IKyberNetworkProxy = artifacts.require('KyberNetworkProxyInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');

const UniswapFactoryAddress = '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351';
const KyberNetworkProxyAddress = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';

const tokenAddresses = {
  KNC: '',
  SNT: '',
  MANA: '',
  BAT: '',
  RDN: '',
  SALT: '',
  RCN: '',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
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
    '0x6b175474e89094c44da98b954eedeac495271d0f': '0xdai',
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

const toBN = (num) => {
  return new BigNumber(num);
};


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

const getPriceEthToTokenUni = async (numberOfEth, exchangeAddress) => {
  const uniExchange = uniConfig.exchanges[tokenAddresses.DAI];
  console.log(uniExchange);
}


