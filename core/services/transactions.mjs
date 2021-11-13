import Web3 from 'web3';
import db from './db.mjs';
import helper from '../helper.mjs';
import fetch from 'node-fetch';
import BigNumber from "bignumber.js";

import Contracts from './nft_contracts.mjs';

async function create(data) {
  // console.log(data);
  let sql = `INSERT INTO transactions (`;
  let params = [];
  let values = [];
  let marks = []

  for (const [key, value] of Object.entries(data)) {
    params.push("`"+key+"`");
    values.push(value);
    marks.push("?");
  }

  sql += params.join(", ");
  sql += `) VALUES (`;
  sql += marks.join(", ");
  sql += `) ON DUPLICATE KEY UPDATE tx_pk = tx_pk`;

  // console.log(sql, values);

  const result = await db.query(sql, values);

  let message = 'Error in adding transaction';

  if (result.affectedRows) {
    message = 'Transaction added';
  }

  return { message, result };
}

async function getTransactionData(chain, hash) {
  let url;
  switch (chain) {
    case "polygon":
      url = "https://"+(process.env.POLYGONSCAN_API || "api.polygonscan.com")+"/api?module=proxy&action=eth_getTransactionByHash&txhash=";
      url += hash;
      url += "&apikey=";
      url += process.env.POLYGONSCAN_KEY;
      break;
    case "eth":
      url = "https://"+(process.env.ETHERSCAN_API || "api.etherscan.io")+"/api?module=proxy&action=eth_getTransactionByHash&txhash=";
      url += hash;
      url += "&apikey=";
      url += process.env.ETHERSCAN_KEY;
      break;
    default:
  }

  // console.log(url);
  await helper.wait(200);
  const response = await fetch(url);
  const data = await response.json();
  // console.log(data);

  if (data && data.status) {
    if (data.status === "0" && data.result === "Max rate limit reached, rate limit of 5/1sec applied" || data.result === "Max rate limit reached") {
      console.log("Hit the limit");
      await helper.wait(200);
      return await getTransactionData(chain, hash);
    }
  } else if (data && data.result) {
    // console.log(data.result.value);
    const value = new BigNumber(data.result.value);
    // return Web3.utils.fromWei(value.toString(), 'ether'); // 0x4fefa17b7240000 -> 0.36
    return value.toNumber();
  } else {
    return 0;
  }
}

async function categorizeTx(wallet, tx) {
  let tx_type = "";
  if ((tx.from).toLowerCase() === "0x0000000000000000000000000000000000000000") {
    tx_type = "mint";
  } else if ((tx.to).toLowerCase() === "0x0000000000000000000000000000000000000000" || (tx.to).toLowerCase() === "0x000000000000000000000000000000000000dead") {
    tx_type = "burn";
  } else if ((tx.to).toLowerCase() === (wallet.wallet_address).toLowerCase()) {
    tx_type = "incoming";
  } else if ((tx.from).toLowerCase() === (wallet.wallet_address).toLowerCase()) {
    const isContract = await Contracts.checkAddress(wallet.chain, tx.to);
    if (isContract) {
      tx_type = "staking";
    } else {
      tx_type = "outgoing";
    }
  }

  return tx_type;
}

async function calculateAlphaScore(wallet_address) {
  const sql = `SELECT count(*) AS score FROM transactions t
    WHERE t.to = ? AND tx_type = 'mint'`;

  const rows = await db.query(sql, [wallet_address]);
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function calculateHandScore(wallet_address) {
  const sql = `SELECT ((in_count-out_count)/in_count)*100 AS score, in_count-out_count AS count FROM
    (SELECT count(*) AS in_count FROM transactions t1 WHERE t1.to = ? AND (t1.tx_type = "incoming" OR t1.tx_type = "mint")) a,
    (SELECT count(*) AS out_count FROM transactions t2 WHERE t2.from = ? AND (t2.tx_type = "outgoing" OR t2.tx_type = "burn")) b`;

  const rows = await db.query(sql, [wallet_address, wallet_address]);
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function calculateWhaleScore(wallet_address) {
  const sql = `SELECT SUM(usd_value) AS score FROM
    (SELECT hash, usd_value FROM transactions t
    WHERE t.to = ? AND tx_type = 'incoming'
    GROUP BY hash, usd_value) a`;

  const rows = await db.query(sql, [wallet_address]);
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function calculateGasScore(wallet_address) {
  const sql = `SELECT SUM(gas_usd_value) AS score FROM
    (SELECT hash, gas_usd_value FROM transactions t
    WHERE t.to = ? AND tx_type = 'incoming'
    GROUP BY hash, gas_usd_value) a`;

  const rows = await db.query(sql, [wallet_address]);
  const data = helper.emptyOrRows(rows);

  return { data };
}

export default {
  create,
  getTransactionData,
  categorizeTx,
  calculateAlphaScore,
  calculateHandScore,
  calculateWhaleScore,
  calculateGasScore
}
