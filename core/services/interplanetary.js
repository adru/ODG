const fs = require("fs");
const IPFS = require('ipfs-core');
const pinataSDK = require('@pinata/sdk');
const last = require("it-last");

const dir = {
  output: "./output",
  input: "./input"
}

let ipfs;
let pinata;

async function updateImages(odg_token) {
  console.log("updateImages");
  if (!ipfs) {
    ipfs = await IPFS.create();
  }
  const keys = await ipfs.key.list();
  const image_key_name = odg_token.token_table + "-images";
  let imagesKey = keys.find(key => key.name === image_key_name);
  if (!imagesKey) {
    imagesKey = await ipfs.key.gen(image_key_name, { type: 'rsa', size: 2048 });
  }
  const imageOptions = {
    resolve: false,
    key: image_key_name,
    allowOffline: true
  };

  const imagesIPFS = await pinataUpload(`${dir.output}/${odg_token.token_table}/images`, image_key_name);
  console.log("ifps", imagesIPFS.IpfsHash);
  const imagesIPNS = await ipfs.name.publish(`/ipfs/${imagesIPFS.IpfsHash}`, imageOptions);
  console.log("ipns", imagesIPNS.name);
  const resolvedPath = await last(ipfs.name.resolve(`${imagesIPNS.name}`));
  console.log("resolved ipns", resolvedPath);

  if (odg_token.image_ipfs && odg_token.image_ipfs !== imagesIPFS.IpfsHash) {
    await pinataUnpin(odg_token.image_ipfs);
  }

  return { ipfs: imagesIPFS.IpfsHash, ipns: imagesIPNS.name };
}

async function updateMetadata(odg_token) {
  console.log("updateMetadata");
  if (!ipfs) {
    ipfs = await IPFS.create();
  }
  const keys = await ipfs.key.list();
  const metadata_key_name = odg_token.token_table + "-metadata";
  let metadataKey = keys.find(key => key.name === metadata_key_name);
  if (!metadataKey) {
    metadataKey = await ipfs.key.gen(metadata_key_name, { type: 'rsa', size: 2048 });
  }
  const metadataOptions = {
    resolve: false,
    key: metadata_key_name,
    allowOffline: true
  };

  const metadataIPFS = await pinataUpload(`${dir.output}/${odg_token.token_table}/metadata`, metadata_key_name);
  console.log("ifps", metadataIPFS.IpfsHash);
  const metadataIPNS = await ipfs.name.publish(`/ipfs/${metadataIPFS.IpfsHash}`, metadataOptions);
  console.log("ipns", metadataIPNS.name);
  const resolvedPath = await last(ipfs.name.resolve(`${metadataIPNS.name}`));
  console.log("resolved ipns", resolvedPath);

  if (odg_token.metadata_ipfs && odg_token.metadata_ipfs !== metadataIPFS.IpfsHash) {
    await pinataUnpin(odg_token.metadata_ipfs);
  }

  return { ipfs: metadataIPFS.IpfsHash, ipns: metadataIPNS.name };
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

  // console.log(fs.existsSync(sourcePath));

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

module.exports = {
  updateImages,
  updateMetadata
}
