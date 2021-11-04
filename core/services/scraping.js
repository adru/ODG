const Web3 = require('web3');

const GetOwnersABI = require('../abis/GetOwnersABI.json');
const ODGTokens = require('./odg_tokens');
const ProcessingRequests = require('./processing_requests');

async function start() {
  try {
    let response = await ODGTokens.getAll();
    for await (const token of response.data) {
      // console.log(token);
      scrapeToken(token);
    }
  } catch (err) {
    console.error(`Error`, err.message);
  }
};

async function scrapeToken(token) {
  let web3;
  if (token.chain === "matic") {
    web3 = new Web3("https://rpc-mumbai.maticvigil.com/");
  }
  const contract = new web3.eth.Contract(GetOwnersABI, token.token_address);
  try {
    const data = await contract.methods.getOwners().call({from: '0xA1A8d543824eD33084D5c1A8156A93444e5c4c34'});
    // console.log(token.token_table);
    let token_array = [];
    let now = Math.floor((new Date()).getTime()/1000);
    for await (const [index, owner] of data.entries()) {
      if (index) {
        // console.log(index, owner);
        token_array.push([ token.token_pk, index, owner, token.chain, now ]);
      }
    }
    const insert = await ProcessingRequests.createAll(token_array);
    console.log(insert);
  } catch (err) {
    console.error('Error', err.message);
    console.log("trying again...");
    scrapeToken(token);
  }
}

module.exports = {
  start
}
