import db from './db.mjs';
import helper from '../helper.mjs';
import config from '../config.mjs';
import fetch from 'node-fetch';

async function create(data) {
  const sql = `INSERT INTO nft_contracts
    (contract_address, nft_name, nft_symbol, chain)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE contract_pk = LAST_INSERT_ID(contract_pk)`;

  const result = await db.query(sql, [data.contract_address, data.nft_name, data.nft_symbol, data.chain]);

  let message = 'Error in adding contract';
  let insertId = null;

  if (result.affectedRows) {
    message = 'Contract added';
    insertId = result.insertId;
  }

  return { message, insertId };
}

async function checkAddress(chain, address) {
  let url;
  switch (chain) {
    case "polygon":
      url = "https://"+(process.env.POLYGONSCAN_API || "api.polygonscan.com")+"/api?module=account&action=tokennfttx&contractaddress=";
      url += address;
      url += "&page=1&offset=1&sort=asc&apikey="; // offset 1, just need to check if it's a contract - don't need to see it's data
      url += process.env.POLYGONSCAN_KEY;
      break;
    case "eth":
      url = "https://"+(process.env.ETHERSCAN_API || "api.etherscan.io")+"/api?module=account&action=tokennfttx&contractaddress=";
      url += address;
      url += "&page=1&offset=1&sort=asc&apikey="; // offset 1, just need to check if it's a contract - don't need to see it's data
      url += process.env.ETHERSCAN_KEY;
      break;
    default:
  }

  const response = await fetch(url);
  const data = await response.json();
  return (data.status === "1");
}

export default {
  create,
  checkAddress
}
