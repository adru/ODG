import mysql from 'mysql2/promise';
import config from '../config.js';
import db from './db.js';
import helper from '../helper.js';

async function create(token_fk, token_id, wallet_address, chain, created_date) {
  const result = await db.query(
    `INSERT INTO queued_requests
      (token_fk, token_id, wallet_address, chain, created_date)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE request_pk = request_pk, wallet_address = VALUES(wallet_address), created_date = VALUES(created_date)`,
    [token_fk, token_id, wallet_address, chain, created_date]
  );

  let message = 'Error in adding request';

  if (result.affectedRows) {
    message = 'Request added';
  }

  return {message};
}

async function createAll(array) {
  const sql = `INSERT INTO queued_requests
    (token_fk, token_id, wallet_address, chain, created_date)
    VALUES ?
    ON DUPLICATE KEY UPDATE request_pk = request_pk, wallet_address = VALUES(wallet_address), created_date = VALUES(created_date)`;

  const result = await db.query(sql, [array]);

  let message = 'Error in adding request';

  if (result.affectedRows) {
    message = 'Request added';
  }

  return {message, result};
}

async function getAll() {
  const sql = `SELECT * FROM queued_requests
    ORDER BY created_date ASC, token_id ASC`;

  const rows = await db.query(sql);
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

async function getByWallet(wallet_address) {
  // get requests that match wallet_address that have been processed in the last hour
  const sql = `SELECT * FROM processed_requests
    WHERE wallet_address = ?
      AND UNIX_TIMESTAMP() - created_date < 3600
    ORDER BY created_date DESC, token_id ASC`;

  const rows = await db.query(sql, [wallet_address]);
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

async function moveRequest(pk) {
  const now = helper.getNow()
  
  const connection = await mysql.createConnection(config.db);
  await connection.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
  await connection.beginTransaction();
  try {
    const insertResult = await connection.execute(`INSERT INTO processed_requests
      SELECT request_pk, token_fk, token_id, wallet_address, chain, ? AS created_date
      FROM queued_requests WHERE request_pk = ?`,
      [now, pk]
    );
    const deleteResult = await connection.execute(`DELETE FROM queued_requests
      WHERE request_pk = ?`,
      [pk]
    );
    await connection.commit();
    connection.end();
    let message = 'Error in deleting request';
    if (insertResult.affectedRows && deleteResult.affectedRows) {
      message = 'Request moved successfully';
    }
    return {message};
  } catch (err) {
    console.error(`Error occurred while creating order: ${err.message}`, err);
    connection.rollback();
    console.info('Rollback successful');
    return 'Error moving request';
  }
}

export default {
  create,
  createAll,
  getAll,
  getByWallet,
  moveRequest
}
