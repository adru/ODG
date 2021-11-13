import db from './db.mjs';
import helper from '../helper.mjs';
import fetch from 'node-fetch';

async function create(wallet_address, now) {
  const result = await db.query(
    `INSERT INTO wallets
      (wallet_address, chain, last_blockNumber, created_date)
      VALUES ?`,
    [[[wallet_address, "eth", 0, now], [wallet_address, "polygon", 0, now]]]
  );

  let message = 'Error in adding wallets';

  if (result.affectedRows) {
    message = 'Wallets added';
  }

  return { message };
}

async function getByAddress(wallet_address) {
  const sql = `SELECT * FROM wallets
    WHERE wallet_address = ?`;

  const rows = await db.query(sql, [wallet_address]);
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function getPkByAddressChain(wallet_address, chain) {
  const sql = `SELECT wallet_pk FROM wallets
    WHERE wallet_address = ? AND chain = ?`;

  const rows = await db.query(sql, [wallet_address, chain]);
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function lookForErrors() {
  const sql = `SELECT wallet_pk FROM wallets
    WHERE updated_date = 0 OR updated_date IS NULL`;

  const rows = await db.query(sql);
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function update(pk, data) {
  let sql = `UPDATE wallets SET `;
  let params = [];
  let values = [];

  for (const [key, value] of Object.entries(data)) {
    params.push("`" + key + "` = ?");
    values.push(value);
  }

  sql += params.join(", ");
  sql += " WHERE wallet_pk = ?";
  values.push(pk);

  const result = await db.query(sql, values);

  let message = 'Error in updating wallet';

  if (result.affectedRows) {
    message = 'Wallet updated';
  }

  return {message};
}

async function getERC20Transactions(wallet, offset) {
  let url;
  switch (wallet.chain) {
    case "polygon":
      url = "https://"+(process.env.POLYGONSCAN_API || "api.polygonscan.com")+"/api?module=account&action=tokentx&address=";
      url += wallet.wallet_address;
      url += "&page=1&offset="+offset+"&startblock=";
      url += wallet.last_blockNumber;
      url += "&sort=asc&apikey=";
      url += process.env.POLYGONSCAN_KEY;
      break;
    case "eth":
      url = "https://"+(process.env.ETHERSCAN_API || "api.etherscan.io")+"/api?module=account&action=tokentx&address=";
      url += wallet.wallet_address;
      url += "&page=1&offset="+offset+"&startblock=";
      url += wallet.last_blockNumber;
      url += "&sort=asc&apikey=";
      url += process.env.ETHERSCAN_KEY;
      break;
    default:
  }
  // console.log(url);
  await helper.wait(200);
  const response = await fetch(url);
  const data = await response.json();
  // console.log(data);
  return data;
}

async function getERC721Transactions(wallet, offset) {
  let url;
  switch (wallet.chain) {
    case "polygon":
      url = "https://"+(process.env.POLYGONSCAN_API || "api.polygonscan.com")+"/api?module=account&action=tokennfttx&address=";
      url += wallet.wallet_address;
      url += "&page=1&offset="+offset+"&startblock=";
      url += wallet.last_blockNumber;
      url += "&sort=asc&apikey=";
      url += process.env.POLYGONSCAN_KEY;
      break;
    case "eth":
      url = "https://"+(process.env.ETHERSCAN_API || "api.etherscan.io")+"/api?module=account&action=tokennfttx&address=";
      url += wallet.wallet_address;
      url += "&page=1&offset="+offset+"&startblock=";
      url += wallet.last_blockNumber;
      url += "&sort=asc&apikey=";
      url += process.env.ETHERSCAN_KEY;
      break;
    default:
  }
  // console.log(url);
  await helper.wait(200);
  const response = await fetch(url);
  const data = await response.json();
  // console.log(data);
  return data;
}

export default {
  create,
  getByAddress,
  getPkByAddressChain,
  lookForErrors,
  update,
  getERC20Transactions,
  getERC721Transactions
}
