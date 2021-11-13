import db from './db.mjs';
import helper from '../helper.mjs';
import config from '../config.mjs';

async function getAll() {
  const rows = await db.query(
    `SELECT token_pk, token_address, token_table, chain, metadata_ipfs, metadata_ipns, image_ipfs, image_ipns, percentiles
    FROM odg_tokens`
  );
  const data = helper.emptyOrRows(rows);

  return { data };
}

async function update(pk, data) {
  let sql = `UPDATE odg_tokens SET `;
  let params = [];
  let values = [];

  for (const [key, value] of Object.entries(data)) {
    params.push("`" + key + "` = ?");
    values.push(value);
  }

  sql += params.join(", ");
  sql += " WHERE token_pk = ?";
  values.push(pk);

  const result = await db.query(sql, values);

  let message = 'Error in updating token';

  if (result.affectedRows) {
    message = 'Token updated';
  }

  return {message};
}

export default {
  getAll,
  update
};
