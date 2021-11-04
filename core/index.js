const express = require('express');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 3000;

const Scraping = require('./services/scraping');

app.use(express.urlencoded({extended: true}));
app.use(express.json());

// SCRAPE EVERY 4 HOURS
cron.schedule('0 */1 * * *', function() {
  console.log('Trigger a task at minute 0 past every hour'); // 0, 4, 8, 12, 16, 20
  Scraping.start();
});

Scraping.start();

// RUNNING!
app.listen(port, () => {
  console.log(`ODG Core listening at port ${port}`);
});
