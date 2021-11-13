import fs from "fs";
import Canvas from "canvas";
import helper from '../helper.mjs';
import * as IPFS from 'ipfs-core';
import config from '../config.mjs';

import ODGTokens from './odg_tokens.mjs';
import ODGNFTTokens from './odg_nft_tokens.mjs';
// import Interplanetary from './interplanetary.js';
import Subplanetary from './subplanetary.js';

const imageFormat = {
  width: 1000,
  height: 1000
}
const dir = config.dir;
let ipfs;

async function recreateOutputsDir(folder) {
  if (fs.existsSync(`${dir.output}/${folder}`)) {
    fs.rmdirSync(`${dir.output}/${folder}`, { recursive: true });
  }

  fs.mkdirSync(`${dir.output}/${folder}`);
  fs.mkdirSync(`${dir.output}/${folder}/metadata`);
  fs.mkdirSync(`${dir.output}/${folder}/images`);
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
  await fs.writeFileSync(`${dir.output}/${odg_token.token_table}/metadata/${odg_nft_token.token_id}`, JSON.stringify(newMetadata));

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

  await fs.writeFileSync(`${dir.output}/${odg_token.token_table}/images/${odg_nft_token.token_id}.png`, canvas.toBuffer("image/png"));
}

async function uploadPlanets(odg_token) {
  if (fs.existsSync(`${dir.output}/${odg_token.token_table}`)) {
    const images = await Interplanetary.updateImages(odg_token);
    await checkMetadataMatches(odg_token, images.ipns);
    const metadata = await Interplanetary.updateMetadata(odg_token);
    // IPNS should never change, so a manual update of tokenURI should suffice
    await ODGTokens.update(odg_token.token_pk, { metadata_ipfs: metadata.ipfs, metadata_ipns: metadata.ipns, image_ipfs: images.ipfs, image_ipns: images.ipns });
  } else {
    console.error("Folder doesn't exist yet. Carry on...");
  }
}

async function checkMetadataMatches(odg_token, ipns) {
  const rawMetadataCheck = await fs.readFileSync(`${dir.input}/${odg_token.token_table}/metadata-base/1`);
  const baseMetadataCheck = JSON.parse(rawMetadataCheck);

  const ipns_root = `ipns://${ipns}`;
  console.log(ipns_root, baseMetadataCheck);

  if (baseMetadataCheck.image !== `${ipns_root}/1.png`) {
    const inputPath = `${dir.input}/${odg_token.token_table}/metadata-base`;
    const inputFilenames = await fs.readdir(inputPath);
    for (const inFile of inputFilenames) {
      console.log(inFile);
      const rawMetadata = await fs.readFileSync(`${inputPath}/${inFile}`);
      const baseMetadata = JSON.parse(rawMetadata);
      const newMetadata = { ...baseMetadata, image: `${ipns_root}/${a}.png` };
      await fs.writeFileSync(`${inputPath}/${inFile}`, JSON.stringify(newMetadata));
    }
    const outputPath = `${dir.output}/${odg_token.token_table}/metadata`;
    const outputFilenames = await fs.readdir(outputPath);
    for (const outFile of outputFilenames) {
      const rawMetadata = await fs.readFileSync(`${outputPath}/${outFile}`);
      const baseMetadata = JSON.parse(rawMetadata);
      const newMetadata = { ...baseMetadata, image: `${ipns_root}/${odg_nft_token.token_id}.png` };
      await fs.writeFileSync(`${outputPath}/${outFile}`, JSON.stringify(newMetadata));
    }
  } else {
    console.log("Passed metadata check");
  }
}

async function forceTheSeaToOpen(odg_tokens) {
  // hit opensea
  console.log("Hit opensea");
}

export default {
  recreateOutputsDir,
  recreateImageAndMetadata,
  uploadPlanets,
  forceTheSeaToOpen
}
