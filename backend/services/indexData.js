/**
 * Index data service — thin wrapper around the JSON store.
 */

const store = require('../db/store');

function getDaily(code, opts) {
  return store.getDaily(code, opts);
}

function getLatest() {
  return store.getLatest();
}

function getCycles() {
  return store.getCycles();
}

module.exports = { getDaily, getLatest, getCycles };
