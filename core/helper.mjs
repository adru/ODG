function getOffset(currentPage = 1, listPerPage) {
  return (currentPage - 1) * [listPerPage];
}

function emptyOrRows(rows) {
  if (!rows) {
    return [];
  }
  return rows;
}

function getNow() {
  return Math.floor((new Date()).getTime()/1000);
}

function wait(ms) {
  return new Promise(resolve => {
    console.log("fetching...", ms)
    setTimeout(() => { resolve('') }, ms);
  })
}

function parseFilename(str) {
  return str.replace(/\s+/g, '-').toLowerCase();
}

export default {
  getOffset,
  emptyOrRows,
  getNow,
  wait,
  parseFilename
};
