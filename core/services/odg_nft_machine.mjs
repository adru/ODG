import fs from "fs-extra";
import Canvas from "canvas";
import helper from '../helper.mjs';
import config from '../config.mjs';
import fetch from 'node-fetch';

import ODGTokens from './odg_tokens.mjs';
import ODGNFTTokens from './odg_nft_tokens.mjs';
// import Interplanetary from './interplanetary.js';
import Subplanetary from './subplanetary.mjs';

const imageFormat = {
  width: 1000,
  height: 1000
}
const dir = config.dir;

async function recreateOutputsDir(odg_token) {
  const metadataOutputPath = `${dir.metadataOutput}/${odg_token.token_address}`;
  if (fs.existsSync(metadataOutputPath)) {
    await fs.rmdirSync(metadataOutputPath, { recursive: true });
  }
  await fs.mkdirSync(metadataOutputPath, { recursive: true });
  await fs.copySync(`${dir.input}/${odg_token.token_table}/metadata-hidden/`, metadataOutputPath);

  const imageOutputPath = `${dir.imageOutput}/${odg_token.token_table}`;
  if (fs.existsSync(imageOutputPath)) {
    await fs.rmdirSync(imageOutputPath, { recursive: true });
  }
  await fs.mkdirSync(`${imageOutputPath}/images`, { recursive: true });
}

async function recreateImageAndMetadata(odg_token, odg_nft_token) {
  const rawMetadata = await fs.readFileSync(`${dir.input}/${odg_token.token_table}/metadata-base/${odg_nft_token.token_id}`);
  const baseMetadata = JSON.parse(rawMetadata);

  let newAttributes = [ ...baseMetadata.attributes ];
  newAttributes.push({ trait_type: 'Rank', value: odg_nft_token.rank });

  let newBase;
  let p = odg_nft_token.percentile;
  let pValues = JSON.parse(odg_token.percentiles);

  for (const pV of pValues) {
    if (parseFloat(p) >= parseFloat(pV.percentile)) {
      newBase = pV.value;
      break;
    }
  }

  newAttributes = newAttributes.map(attr => attr.trait_type === "Circle" ? { ...attr, value: newBase } : attr);
  let newMetadata = { ...baseMetadata, attributes: newAttributes };
  await fs.writeFileSync(`${dir.metadataOutput}/${odg_token.token_address}/${odg_nft_token.token_id}`, JSON.stringify(newMetadata));

  const canvas = Canvas.createCanvas(imageFormat.width, imageFormat.height);
  const ctx = canvas.getContext("2d");
  const layerOrder = ["Square", "Circle"];

  // draw background
  const backgroundData = newAttributes.filter(attr => attr.trait_type === "Background");
  const backgroundImage = await Canvas.loadImage(`${dir.input}/${odg_token.token_table}/traits/Background/${helper.parseFilename(backgroundData[0].value)}.jpg`);
  ctx.drawImage(backgroundImage,0,0,imageFormat.width,imageFormat.height);

  for (const layer of layerOrder) {
    const traitData = newAttributes.filter(attr => attr.trait_type === layer);
    const traitImage = await Canvas.loadImage(`${dir.input}/${odg_token.token_table}/traits/${layer}/${helper.parseFilename(traitData[0].value)}.png`);
    ctx.drawImage(traitImage,0,0,imageFormat.width,imageFormat.height);
  }

  await fs.writeFileSync(`${dir.imageOutput}/${odg_token.token_table}/images/${odg_nft_token.token_id}.png`, canvas.toBuffer("image/png"));
}

async function uploadPlanets(odg_token) {
  let metadataOutputPath = `${dir.metadataOutput}/${odg_token.token_address}/1`;
  let imageOutputPath = `${dir.imageOutput}/${odg_token.token_table}/images`;
  if (fs.existsSync(metadataOutputPath) && fs.existsSync(imageOutputPath)) {
    const images = await Subplanetary.updateImages(odg_token, imageOutputPath);
    await checkMetadataMatches(odg_token, images.ipfs);
    // Metadata will be centralized at https://api.originaldegens.io/${odg_token.token_address}/${token_id}
    if (odg_token.image_ipfs !== images.ipfs) {
      await ODGTokens.update(odg_token.token_pk, { metadata_path: `${dir.resolvedOutput}/${odg_token.token_address}/`, image_ipfs: images.ipfs });
      return true;
    } else {
      console.log("No change in data.");
      return false;
    }
  } else {
    console.error("Folders don't exist yet. Carry on...");
    return false;
  }
}

async function checkMetadataMatches(odg_token, ipfs) {
  const rawMetadataCheck = await fs.readFileSync(`${dir.input}/${odg_token.token_table}/metadata-base/1`);
  const baseMetadataCheck = JSON.parse(rawMetadataCheck);

  const ipfs_root = `ipfs://${ipfs}`;
  // console.log(ipfs, baseMetadataCheck);

  if (baseMetadataCheck.image !== `${ipfs_root}/1.png`) {
    const inputPath = `${dir.input}/${odg_token.token_table}/metadata-base`;
    const inputFilenames = await fs.readdirSync(inputPath);
    for (const inFile of inputFilenames) {
      if (inFile[0] === ".") {
        console.log("Skipping", inFile);
      } else {
        // console.log(inFile);
        const rawMetadata = await fs.readFileSync(`${inputPath}/${inFile}`);
        const baseMetadata = JSON.parse(rawMetadata);
        const newMetadata = { ...baseMetadata, image: `${ipfs_root}/${inFile}.png` };
        await fs.writeFileSync(`${inputPath}/${inFile}`, JSON.stringify(newMetadata));
      }
    }
    const outputPath = `${dir.metadataOutput}/${odg_token.token_address}`;
    const outputFilenames = await fs.readdirSync(outputPath);
    for (const outFile of outputFilenames) {
      if (outFile[0] === ".") {
        console.log("Skipping", outFile);
      } else {
        // console.log(inFile);
        const rawMetadata = await fs.readFileSync(`${outputPath}/${outFile}`);
        const baseMetadata = JSON.parse(rawMetadata);
        const newMetadata = { ...baseMetadata, image: `${ipfs_root}/${outFile}.png` };
        await fs.writeFileSync(`${outputPath}/${outFile}`, JSON.stringify(newMetadata));
      }
    }
  } else {
    console.log("Passed metadata check");
  }
}

async function forceTheSeaToOpen(odg_tokens) {
  for (const odg_token of odg_tokens) {
    console.log("OS Update", odg_token.token_table);
    const url = `${process.env.OPENSEA_API}/${odg_token.token_address}`;
    const odg_nft_tokens = await ODGNFTTokens.getAll(odg_token.token_table);
    for (const odg_nft_token of odg_nft_tokens.data) {
      const forceUrl = `${url}/${odg_nft_token.token_id}/?force_update=true`;
      await helper.wait(200);
      // console.log("Update OS", forceUrl);
      await fetch(forceUrl);
    }
  }
}

export default {
  recreateOutputsDir,
  recreateImageAndMetadata,
  uploadPlanets,
  forceTheSeaToOpen
}
