import dotenv from 'dotenv';
dotenv.config({ path: './.env.testnet' });

const env = process.env;

const config = {
  db: {
    host: env.DB_HOST || '127.0.0.1',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || 'root',
    database: env.DB_NAME || '_odg',
    port: env.DB_PORT || '3306',
    timezone:'+00:00',
  },
  dir: {
    resolvedOutput: "https://api.originaldegens.io",
    metadataOutput: env.OUTPUT_PATH || "./output",
    imageOutput: "./output",
    input: "./input"
  }
};

export default config;
