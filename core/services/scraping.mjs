import Web3 from 'web3';
import AlchemyWeb3 from "@alch/alchemy-web3";
import helper from '../helper.mjs';
import config from '../config.mjs';

import GetOwnersABI from '../abis/GetOwnersABI.json';
import ODGTokens from './odg_tokens.mjs';
import Requests from './requests.mjs';

// import { readFile } from 'fs/promises';
// const GetOwnersABI = JSON.parse(await readFile(new URL('../abis/GetOwnersABI.json', import.meta.url)));

async function start() {
  try {
    let response = await ODGTokens.getAll();
    for (const token of response.data) {
      // console.log(token);
      await scrapeToken(token);
    }
  } catch (err) {
    console.error(`Error`, err.message);
  }
};

async function scrapeToken(token) {
  console.log("Scraping token...", token.token_address, token.chain);
  let web3;
  if (token.chain === "polygon") {
    web3 = new Web3(process.env.POLYGON_RPC);
  } else if (token.chain === "eth") {
    web3 = AlchemyWeb3.createAlchemyWeb3(process.env.ALCHEMY_RPC);
  }
  const contract = new web3.eth.Contract(GetOwnersABI, token.token_address);
  try {
    const data = await contract.methods.getOwners().call({from: process.env.ADMIN_ADDRESS});
    // console.log(token.token_table);
    let token_array = [];
    for await (const [index, owner] of data.entries()) {
      if (index) {
        // console.log(index, owner);
        token_array.push([ token.token_pk, index, owner, token.chain, helper.getNow() ]);
      }
    }
    // console.log(token_array);
    const insert = await Requests.createAll(token_array);
    return true;
  } catch (err) {
    console.error('Error', err.message);
    // console.log("trying again...");
    // scrapeToken(token);
  }
}

export default {
  start
}
