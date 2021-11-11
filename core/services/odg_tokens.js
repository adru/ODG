import db from './db.js';
import helper from '../helper.js';
import config from '../config.js';

async function getAll() {
  const rows = await db.query(
    `SELECT token_pk, token_address, token_table, chain, metadata_hash, image_hash, percentiles
    FROM odg_tokens`
  );
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

export default {
  getAll
};
