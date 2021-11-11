import fs from "fs";
import Canvas from "canvas";
import helper from '../helper.js';

const imageFormat = {
  width: 1000,
  height: 1000
}
const dir = {
  output: "../output",
  input: "../input"
}

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

export default {
  recreateOutputsDir,
  recreateImageAndMetadata,
}
