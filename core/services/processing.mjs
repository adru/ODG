import helper from '../helper.mjs';

import Requests from './requests.mjs';
import ODGTokens from './odg_tokens.mjs';
import ODGNFTTokens from './odg_nft_tokens.mjs';
import ODGNFTMachine from './odg_nft_machine.mjs';
import Wallets from './wallets.mjs';
import Contracts from './nft_contracts.mjs';
import Transactions from './transactions.mjs';
import Currencies from './currencies.mjs';

async function start() {
  try {
    const requests = await Requests.getAll();
    if (requests && requests.data.length) {
      const odg_tokens = await ODGTokens.getAll();

      for (const request of requests.data) {
        await checkRequests(request);
        const odg_token = odg_tokens.data.filter(t => t.token_pk === request.token_fk);
        const wallet = await Wallets.getPkByAddressChain(request.wallet_address, request.chain);
        const insertODGToken = await ODGNFTTokens.create(odg_token[0].token_table, { token_id: request.token_id, wallet_fk: wallet.data[0].wallet_pk, now: helper.getNow() });
      }

      await calculateScores(odg_tokens);
    }
  } catch (err) {
    console.error(`Start Error`, err.message);
  }
};

async function calculateScores(odg_tokens) {
  const walletError = await Wallets.lookForErrors();
  // SKIP RANKING and the MACHINE if there's an error.
  if (!walletError.data.length) {
    const rankRequests = await Requests.getAll();
    for (const rankRequest of rankRequests.data) {
      for (const odg_token of odg_tokens.data) {
        const wallet_tokens = await ODGNFTTokens.getByAddressChain(odg_token.token_table, rankRequest.wallet_address, rankRequest.chain);
        if (wallet_tokens.data && wallet_tokens.data.length) {
          let score;
          switch (odg_token.token_table) {
            case "odg_alpha_tokens":
              score = await Transactions.calculateAlphaScore(rankRequest.wallet_address);
              break;
            case "odg_hand_tokens":
              score = await Transactions.calculateHandScore(rankRequest.wallet_address);
              break;
            case "odg_whale_tokens":
              score = await Transactions.calculateWhaleScore(rankRequest.wallet_address);
              break;
            case "odg_gas_tokens":
              score = await Transactions.calculateGasScore(rankRequest.wallet_address);
              break;
            default:
              break;
          }
          const wallet = await Wallets.getPkByAddressChain(rankRequest.wallet_address, rankRequest.chain);
          await ODGNFTTokens.updateScoreByWalletPk(odg_token.token_table, wallet.data[0].wallet_pk, score.data[0].score);
          await requestProcessed(rankRequest);
        }
      }
    }

    await startTheMachine(odg_tokens);
  } else {
    console.log(walletError.data.length, "wallets had errors. Do not proceed further.");
  }
}

async function startTheMachine(odg_tokens) {
  for (const odg_token of odg_tokens.data) {
    const table = odg_token.token_table;
    await ODGNFTTokens.rankTokens(table);
    // NFT Machine!
    await ODGNFTMachine.recreateOutputsDir(odg_token);
    const odg_nft_tokens = await ODGNFTTokens.getAll(table);
    for (const odg_nft_token of odg_nft_tokens.data) {
      await ODGNFTMachine.recreateImageAndMetadata(odg_token, odg_nft_token);
    }
    console.log("Subplanetary upload", odg_token.token_table);
    await ODGNFTMachine.uploadPlanets(odg_token);
  }

  await ODGNFTMachine.forceTheSeaToOpen(odg_tokens);
}

async function checkRequests(request) {
  const processed = await Requests.getByWallet(request.wallet_address);
  try {
    if (processed.data && processed.data.length || (request.wallet_address).toLowerCase() === "0x0000000000000000000000000000000000000000" || (request.wallet_address).toLowerCase() === "0x000000000000000000000000000000000000dead") {
      console.log("Request has been skipped", request.request_pk);
      await requestProcessed(request);
    } else {
      console.log("Processing request_pk", request.request_pk);
      await findWallets(request);
    }
  } catch (err) {
    console.error(`Check Requests Error`, err.message);
  }
}

async function requestProcessed(request) {
  await Requests.moveRequest(request.request_pk);
}

async function findWallets(request) {
  const wallets = await Wallets.getByAddress(request.wallet_address);
  if (wallets.data && wallets.data.length) {
    for (const wallet of wallets.data) {
      try {
        await scanExplorers(wallet);
      } catch (err) {
        console.error(`Error scanning explorers`, err.message);
        await Wallets.update(wallet.wallet_pk, { updated_date: 0 });
      }
    }
  } else {
    let now = Math.floor((new Date()).getTime()/1000);
    const newWallets = await Wallets.create(request.wallet_address, now);
    await findWallets(request);
  }
}

async function scanExplorers(wallet) {
  console.log("Scanning wallet_pk", wallet.wallet_pk, wallet.last_blockNumber);
  const offset = 10000;
  const data = await Wallets.getERC721Transactions(wallet, offset);

  if (data) {
    if (data.status === '1') {
      console.log(data.result.length, "transactions to process");
      if (data.result.length) {
        let lastDataBlock = data.result[data.result.length-1].blockNumber;
        let data20 = await Wallets.getERC20Transactions(wallet, offset);
        if (lastDataBlock && data20 && data20.status === '1') {
          // console.log(data20.result.length-1, data20.result[data20.result.length-1]);
          let lastData20Block = data20.result[data20.result.length-1].blockNumber;
          while (lastData20Block < lastDataBlock && data20.result.length === offset) {
            let d = await Wallets.getERC20Transactions({ ...wallet, last_blockNumber: lastData20Block }, offset);
            let data20 = { ...data20, result: { ...data20.result, ...d.result }};
            lastData20Block = data20.result[data20.result.length-1].blockNumber;
          }
        }

        let last_blockNumber = wallet.last_blockNumber;
        let last_hash = "";
        let last_tx;

        for (const tx of data.result) {
          // if the transaction hash is the exact same, it is just purchasing multiple tokens. Skip all the calculations here and save with previous data.
          if (tx.hash !== last_hash) {
            const contract_pk = await Contracts.create({ contract_address: tx.contractAddress, nft_name: tx.tokenName, nft_symbol: tx.tokenSymbol, chain: wallet.chain });
            let erc20Txns;
            if (data20 && data20.status === '1') {
              erc20Txns = data20.result.filter(t => t.hash === tx.hash);
            }

            let txValue = [];
            let currency_fk = [];
            let usdValue = 0;
            let usdGasValue = 0;

            if (erc20Txns && erc20Txns.length) {
              // something has been found, therefore the value is NOT native (matic/eth)
              for (const erc20Txn of erc20Txns) {
                const currency_pk = await Currencies.create({ contract_address: erc20Txn.contractAddress, currency_name: erc20Txn.tokenName, currency_symbol: erc20Txn.tokenSymbol, currency_decimal: erc20Txn.tokenDecimal, chain: wallet.chain });
                currency_fk.push(currency_pk.insertId);
                txValue.push(erc20Txn.value);
                let txUsdValue = await Currencies.getUSDConversion(erc20Txn);
                // console.log(txUsdValue);
                usdValue += parseFloat(txUsdValue);
              }
            } else {
              // ASSUMPTION: This transaction data can only contain the native token
              const txTxValue = await Transactions.getTransactionData(wallet.chain, tx.hash);
              txValue = [txTxValue];
              // if the value is still 0, it's probably 0
              if (wallet.chain === "polygon") {
                if (txTxValue && txTxValue > 0) {
                  usdValue = await Currencies.getUSDConversion({ value: txTxValue, tokenSymbol: "MATIC", timeStamp: tx.timeStamp, tokenDecimal: 18 });
                }
                currency_fk = [2];
              } else if (wallet.chain === "eth") {
                if (txTxValue && txTxValue > 0) {
                  usdValue = await Currencies.getUSDConversion({ value: txTxValue, tokenSymbol: "ETH", timeStamp: tx.timeStamp, tokenDecimal: 18 });
                }
                currency_fk = [1];
              }
            }

            if (wallet.chain === "polygon") {
              usdGasValue = await Currencies.getUSDConversion({ value: tx.gasPrice * tx.gasUsed, tokenSymbol: "MATIC", timeStamp: tx.timeStamp, tokenDecimal: 18 });
            } else if (wallet.chain === "eth") {
              usdGasValue = await Currencies.getUSDConversion({ value: tx.gasPrice * tx.gasUsed, tokenSymbol: "ETH", timeStamp: tx.timeStamp, tokenDecimal: 18 });
            }

            const txType = await Transactions.categorizeTx(wallet, tx);
            last_tx = { chain: wallet.chain, block_number: tx.blockNumber, hash: tx.hash, from: tx.from, to: tx.to, contract_fk: contract_pk.insertId, value: txValue.toString(), usd_value: usdValue, currency_fk: currency_fk.toString(), timestamp: tx.timeStamp, gas_price: tx.gasPrice, gas_used: tx.gasUsed, gas_usd_value: usdGasValue, tx_type: txType };
          }

          const transaction = await Transactions.create({ ...last_tx, token_id: tx.tokenID });
          last_blockNumber = tx.blockNumber;
        }

        // if the result is not full, then the last blocknumber is most likely done, move onto the next.
        // if the result is full, keep the last blocknumber in case it carries over to the next page.
        let newWallet = { ...wallet, last_blockNumber: (data.result.length < offset) ? parseInt(last_blockNumber)+1 : last_blockNumber }
        if (data.result.length < offset) {
          await updateWalletBlock(newWallet);
        } else {
          await scanExplorers(newWallet);
        }
      }
    } else {
      await updateWalletBlock(wallet);
    }
  }
}

async function updateWalletBlock(wallet) {
  console.log("Update wallet", wallet.last_blockNumber);
  await Wallets.update(wallet.wallet_pk, { last_blockNumber: wallet.last_blockNumber, updated_date: helper.getNow() });
}

export default {
  start
}
