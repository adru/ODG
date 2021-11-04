const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function getAll() {
  const rows = await db.query(
    `SELECT token_pk, token_address, token_table, chain
    FROM odg_tokens`
  );
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

module.exports = {
  getAll
}
