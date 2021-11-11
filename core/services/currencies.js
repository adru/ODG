import db from './db.js';
import helper from '../helper.js';
import fetch from 'node-fetch';
import BigNumber from "bignumber.js";

async function create(data) {
  const sql = `INSERT INTO currencies
    (contract_address, currency_name, currency_symbol, currency_decimal, chain)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE currency_pk = LAST_INSERT_ID(currency_pk)`;

  const result = await db.query(sql, [data.contract_address, data.currency_name, data.currency_symbol, data.currency_decimal, data.chain]);

  let message = 'Error in adding currency';
  let insertId = null;

  if (result.affectedRows) {
    message = 'Currency added';
    insertId = result.insertId;
  }

  return { message, insertId };
}

async function getByAddress(contract_address) {
  const sql = `SELECT * FROM currencies
    WHERE contract_address = ?`;

  const rows = await db.query(sql, [contract_address]);
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

async function getPkByAddressChain(contract_address, chain) {
  const sql = `SELECT currency_pk, currency_symbol FROM currencies
    WHERE contract_address = ? AND chain = ?`;

  const rows = await db.query(sql, [contract_address, chain]);
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

async function getUSDConversion(tx) {
  let ts = tx.tokenSymbol;
  if (ts === "WETH" || ts === "wstETH") {
    ts = "ETH";
  } else if (ts === "WFIL") {
    ts = "FIL";
  } else if (ts === "WMATIC") {
    ts = "MATIC";
  } else if (ts === "wCELO") {
    ts = "CELO";
  } else if (ts === "wMANA") {
    ts = "MANA";
  } else if (ts === "wCUSD") {
    ts = "CUSD";
  }

  let url = "https://min-api.cryptocompare.com/data/pricehistorical?fsym="
  url += ts;
  url += "&tsyms=USD&ts=";
  url += tx.timeStamp;
  url += "&api_key="+process.env.CRYPTOCOMPARE_KEY;

  let response = await fetch(url);
  let data = await response.json();

  if (data.Response === "Error" && ts[0] === "W") {
    ts = ts.substring(1);
    url = "https://min-api.cryptocompare.com/data/pricehistorical?fsym="
    url += ts;
    url += "&tsyms=USD&ts=";
    url += tx.timeStamp;
    url += "&api_key="+process.env.CRYPTOCOMPARE_KEY;

    response = await fetch(url);
    data = await response.json();
  }

  let usdRate = 0;
  if (data[ts] && data[ts].USD) {
    usdRate = data[ts].USD;
  }

  const txValue = BigNumber(tx.value).shiftedBy((tx.tokenDecimal * -1)).toNumber().toFixed(6);

  // let usdc = 157965406;
  // let eth = 954395641000000000;
  // let sand = 6000000000000000000000;

  // console.log(BigNumber(usdc).shiftedBy(-6).toNumber().toFixed(6));
  // console.log(BigNumber(eth).shiftedBy(-18).toNumber().toFixed(6));
  // console.log(BigNumber(sand).shiftedBy(-18).toNumber().toFixed(6));

  return (txValue * usdRate).toFixed(6);
}

export default {
  create,
  getByAddress,
  getPkByAddressChain,
  getUSDConversion
}
