import express from 'express';
import cron from 'node-cron';

// import Scraping from './services/scraping.mjs';
import Processing from './services/processing.mjs';

import ODGTokens from './services/odg_tokens.mjs';
import ODGNFTTokens from './services/odg_nft_tokens.mjs';
import ODGNFTMachine from './services/odg_nft_machine.mjs';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({extended: true}));
app.use(express.json());

let busy = false;

async function testing() {
  const odg_tokens = await ODGTokens.getAll();

  for (const odg_token of odg_tokens.data) {
    // const table = odg_token.token_table;
    // await ODGNFTTokens.rankTokens(table);
    // // NFT Machine!
    // await ODGNFTMachine.recreateOutputsDir(table);
    // const odg_nft_tokens = await ODGNFTTokens.getAll(table);
    // for (const odg_nft_token of odg_nft_tokens.data) {
    //   await ODGNFTMachine.recreateImageAndMetadata(odg_token, odg_nft_token);
    // }
    await ODGNFTMachine.uploadPlanets(odg_token);
  }
}
testing();

// // SCRAPE EVERY 4 HOURS
// cron.schedule('0 */4 * * *', function() {
//   // console.log('Trigger a task at minute 0 past every 4 hours'); // 0, 4, 8, 12, 16, 20
//   startScraping();
// });

// TRIGGER QUEUE EVERY MINUTE
// cron.schedule('*/5 * * * *', function() {
//   console.log('Trigger a task every 5 minutes');
//   startProcess();
// });
//
// startProcess();

// TRIGGER PROCESSING REQUESTS
app.get('/process', async function(req, res, next) {
  try {
    startProcess();
  } catch (err) {
    console.error("Error:", err);
    next(err);
  }
});

// Scrape the tokens for their owners
async function startScraping() {
  busy = true;
  const scraped = await Scraping.start();
  busy = false;
  console.log("Scraping", scraped);
  startProcess();
}

// Start the process...
async function startProcess() {
  if (busy) {
    console.log("Still working on it!");
    return false;
  }
  busy = true;
  console.log("Starting process...");
  await Processing.start();
  busy = false;
  console.log("Done processing!");
}

// RUNNING!
app.listen(port, () => {
  console.log(`ODG Core listening at port ${port}`);
});
