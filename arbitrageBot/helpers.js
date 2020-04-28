const rp = require('request-promise');

const getJointTokensUniKyber = async () => {
  const optionsKyber = {
    url: 'https://ropsten-api.kyber.network/currencies',
    json: true
  };

  const optionsUniswap = {
    url: 'https://api.uniswap.info/v1/assets',
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

getJointTokensUniKyber();