// ─── patch-fs.js ───────────────────────────────────────
const fs = require('fs');
const fsp = require('fs/promises');

// Parcheja callback-style
const origRename = fs.rename;
fs.rename = (src, dest, cb) => {
  if (dest === undefined) {
    console.error('❌ [patch-fs] fs.rename dest=undefined · src=', src);
    console.trace();
  }
  return origRename.call(fs, src, dest, cb);
};

const origCopy = fs.copyFile;
fs.copyFile = (src, dest, ...args) => {
  if (dest === undefined) {
    console.error('❌ [patch-fs] fs.copyFile dest=undefined · src=', src);
    console.trace();
  }
  return origCopy.call(fs, src, dest, ...args);
};

// Parcheja promise-style
const origRenameP = fsp.rename;
fsp.rename = (src, dest, ...args) => {
  if (dest === undefined) {
    console.error('❌ [patch-fs] fsp.rename dest=undefined · src=', src);
    console.trace();
  }
  return origRenameP.call(fsp, src, dest, ...args);
};

const origCopyP = fsp.copyFile;
fsp.copyFile = (src, dest, ...args) => {
  if (dest === undefined) {
    console.error('❌ [patch-fs] fsp.copyFile dest=undefined · src=', src);
    console.trace();
  }
  return origCopyP.call(fsp, src, dest, ...args);
};
// ────────────────────────────────────────────────────────
