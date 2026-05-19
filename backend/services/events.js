/**
 * Events service — thin wrapper around the JSON store.
 */

const store = require('../db/store');

function listEvents(opts) {
  return store.listEvents(opts);
}

function getEventById(id) {
  return store.getEventById(id);
}

function getTodayInHistory(month, day) {
  return store.getTodayInHistory(month, day);
}

module.exports = { listEvents, getEventById, getTodayInHistory };
