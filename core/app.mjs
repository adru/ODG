import express from 'express';
import cron from 'node-cron';

import Scraping from './services/scraping.mjs';
import Processing from './services/processing.mjs';

// const app = express();
const port = process.env.PORT || 3000;

// app.use(express.urlencoded({extended: true}));
// app.use(express.json());

let busy = false;

// SCRAPE EVERY 4 HOURS
cron.schedule('0 */4 * * *', function() {
  console.log('Scrape the tokens every 4 hours'); // 0, 4, 8, 12, 16, 20
  startScraping();
});

// TRIGGER QUEUE EVERY MINUTE
cron.schedule('*/5 * * * *', function() {
  console.log('Process the queue every 5 minutes');
  startProcess();
});

startScraping();

// TRIGGER PROCESSING REQUESTS
// app.get('/process', async function(req, res, next) {
//   try {
//     startProcess();
//   } catch (err) {
//     console.error("Error:", err);
//     next(err);
//   }
// });

// Scrape the tokens for their owners
async function startScraping() {
  busy = true;
  await Scraping.start();
  busy = false;
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
// app.listen(port, () => {
//   console.log(`ODG Core listening at port ${port}`);
// });
