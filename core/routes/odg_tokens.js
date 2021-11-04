const express = require('express');
const router = express.Router();
const odg_tokens = require('../services/odg_tokens');

/* GET programming languages. */
router.get('/', async function(req, res, next) {
  try {
    res.json(await odg_tokens.getAll());
  } catch (err) {
    console.error(`Error`, err.message);
    next(err);
  }
});

// router.post('/', async function(req, res, next) {
//   try {
//     res.json(await programmingLanguages.create(req.body));
//   } catch (err) {
//     console.error(`Error while creating programming language`, err.message);
//     next(err);
//   }
// });

// router.put('/:id', async function(req, res, next) {
//   try {
//     res.json(await programmingLanguages.update(req.params.id, req.body));
//   } catch (err) {
//     console.error(`Error while updating programming language`, err.message);
//     next(err);
//   }
// });

// router.delete('/:id', async function(req, res, next) {
//   try {
//     res.json(await programmingLanguages.remove(req.params.id));
//   } catch (err) {
//     console.error(`Error while deleting programming language`, err.message);
//     next(err);
//   }
// });

module.exports = router;
