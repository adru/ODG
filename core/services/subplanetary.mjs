import fs from "fs";
import pinataSDK from '@pinata/sdk';
import config from '../config.mjs';

const dir = config.dir;
let pinata;

async function updateImages(odg_token, outputPath) {
  // console.log("updateImages");
  const image_key_name = odg_token.token_table + "-images";
  const imagesIPFS = await pinataUpload(`${outputPath}`, image_key_name);
  // console.log("ifps", imagesIPFS.IpfsHash);

  if (odg_token.image_ipfs && odg_token.image_ipfs !== imagesIPFS.IpfsHash) {
    await pinataUnpin(odg_token.image_ipfs);
  }

  return { ipfs: imagesIPFS.IpfsHash };
}

async function pinataUpload(path, key_name) {
  if (!pinata) {
    pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);
  }
  const sourcePath = path;
  const options = {
    pinataMetadata: {
      name: key_name
    }
  };

  try {
    const pinnedFolder = await pinata.pinFromFS(sourcePath, options);
    return pinnedFolder;
  } catch(err) {
    console.error("Pinning error", err);
  }
}

async function pinataUnpin(hashToUnpin) {
  if (!pinata) {
    pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);
  }
  try {
    await pinata.unpin(hashToUnpin);
  } catch(err) {
    console.error("Unpinning error", err);
  }
}

export default {
  updateImages
}
