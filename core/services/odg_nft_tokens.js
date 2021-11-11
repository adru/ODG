import db from './db.js';
import helper from '../helper.js';
import config from '../config.js';

async function create(table, data) {
  const sql = `INSERT INTO `+table+`
    (token_id, wallet_fk, hodl_date)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE token_id = token_id, hodl_date = IF(wallet_fk = VALUES(wallet_fk), hodl_date, VALUES(hodl_date)), wallet_fk = VALUES(wallet_fk)`;

  const result = await db.query(sql, [data.token_id, data.wallet_fk, data.now]);

  let message = 'Error in adding request';

  if (result.affectedRows) {
    message = 'Request added';
  }

  return {message};
}

async function getByAddressChain(table, address, chain) {
  const sql = `SELECT * FROM `+table+` t
    LEFT JOIN wallets w ON t.wallet_fk = w.wallet_pk
    WHERE w.wallet_address = ? AND w.chain = ?`;

  const rows = await db.query(sql, [address, chain]);
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

async function getAll(table) {
  const rows = await db.query(
    `SELECT * FROM `+table+` ORDER BY token_id ASC`
  );
  const data = helper.emptyOrRows(rows);

  return {
    data
  }
}

async function updateScoreByWalletPk(table, pk, score) {
  const now = helper.getNow()

  let sql = `UPDATE `+table+` SET score = ?, modified_date = ? WHERE wallet_fk = ?`;
  const result = await db.query(sql, [score, now, pk]);

  let message = 'Error in updating scores';
  if (result.affectedRows) {
    message = 'Scores updated';
  }
  return {message};
}

async function rankTokens(table) {
  let sql = `UPDATE `+table+` a INNER JOIN (SELECT token_id,
      @rank := IF (@rankScore = score, @rank, @count) AS rank,
      @percentile := IF(@rankScore=score, @percentile, ROUND((@totalToken - @count + 1)/(@totalToken)*100,2)) AS percentile,
      @rankScore := score,
      @count := @count + 1
    FROM `+table+` t, (SELECT @rank := 0, @rankScore := 0, @count := 1, @percentile := 100, @totalToken := (SELECT count(*) FROM odg_alpha_tokens) s ) r
    ORDER BY score DESC) b ON a.token_id = b.token_id
    SET a.rank = b.rank, a.percentile = b.percentile`;
  const result = await db.query(sql);

  let message = 'Error in updating ranks';
  if (result.affectedRows) {
    message = 'Ranks updated';
  }
  return {message};
}

export default {
  create,
  getByAddressChain,
  getAll,
  updateScoreByWalletPk,
  rankTokens
}
