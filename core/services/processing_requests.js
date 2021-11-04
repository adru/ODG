const db = require('./db');
const helper = require('../helper');

async function create(token_fk, token_id, wallet_address, chain, created_date) {
  const result = await db.query(
    `INSERT INTO processing_requests
      (token_fk, token_id, wallet_address, chain, created_date)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE request_pk = request_pk, wallet_address = VALUES(wallet_address)`,
    [token_fk, token_id, wallet_address, chain, created_date]
  );

  let message = 'Error in adding request';

  if (result.affectedRows) {
    message = 'Request added';
  }

  return {message};
}

async function createAll(array) {
  const sql = `INSERT INTO processing_requests
    (token_fk, token_id, wallet_address, chain, created_date)
    VALUES ?
    ON DUPLICATE KEY UPDATE request_pk = request_pk, wallet_address = VALUES(wallet_address)`;

  const result = await db.query(sql, [array]);

  let message = 'Error in adding request';

  if (result.affectedRows) {
    message = 'Request added';
  }

  return {message, result};
}

// async function create(programmingLanguage){
//   const result = await db.query(
//     `INSERT INTO programming_languages
//     (name, released_year, githut_rank, pypl_rank, tiobe_rank)
//     VALUES
//     (?, ?, ?, ?, ?)`,
//     [
//       programmingLanguage.name, programmingLanguage.released_year,
//       programmingLanguage.githut_rank, programmingLanguage.pypl_rank,
//       programmingLanguage.tiobe_rank
//     ]
//   );
//
//   let message = 'Error in creating programming language';
//
//   if (result.affectedRows) {
//     message = 'Programming language created successfully';
//   }
//
//   return {message};
// }

// async function getMultiple(page = 1){
//   const offset = helper.getOffset(page, config.listPerPage);
//   const rows = await db.query(
//     `SELECT id, name, released_year, githut_rank, pypl_rank, tiobe_rank
//     FROM programming_languages LIMIT ?,?`,
//     [offset, config.listPerPage]
//   );
//   const data = helper.emptyOrRows(rows);
//   const meta = {page};
//
//   return {
//     data,
//     meta
//   }
// }

// async function update(id, programmingLanguage){
//   const result = await db.query(
//     `UPDATE programming_languages
//     SET name=?, released_year=?, githut_rank=?,
//     pypl_rank=?, tiobe_rank=?
//     WHERE id=?`,
//     [
//       programmingLanguage.name, programmingLanguage.released_year,
//       programmingLanguage.githut_rank, programmingLanguage.pypl_rank,
//       programmingLanguage.tiobe_rank, id
//     ]
//   );
//
//   let message = 'Error in updating programming language';
//
//   if (result.affectedRows) {
//     message = 'Programming language updated successfully';
//   }
//
//   return {message};
// }

// async function remove(id){
//   const result = await db.query(
//     `DELETE FROM programming_languages WHERE id=?`,
//     [id]
//   );
//
//   let message = 'Error in deleting programming language';
//
//   if (result.affectedRows) {
//     message = 'Programming language deleted successfully';
//   }
//
//   return {message};
// }

module.exports = {
  create,
  createAll,
  // create,
  // update,
  // remove
}
