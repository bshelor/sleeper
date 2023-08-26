const { players } = require('./players');
const { stats } = require('./stats');
const fs = require('fs');

function replaceNulls(obj) {
  const updated = {};
  Object.keys(obj).forEach((key) => {
    updated[key] = obj[key] ? obj[key] : '';
  });
  return updated;
}

function mergePlayersAndStats(playersObj, statsObj) {
  const merged = {};
  Object.keys(playersObj).forEach((playerId) => {
    const mergeObj = {
      ...playersObj[playerId],
      ...statsObj[playerId]
    };
    // only merge if playerId is in both objects
    if (statsObj[playerId]) { merged[playerId] = replaceNulls(mergeObj); }
  });
  return merged;
}

function trimStatsObj(aggregateStatsObj) {
  // aggregate stats object
  const paramsToCollect = ['pts_ppr', 'rank_ppr', 'pos_rank_ppr', 'full_name'];
  const finalObj = {};
  Object.keys(aggregateStatsObj).forEach((playerId) => {
    const playerObj = {};
    paramsToCollect.forEach((prop) => {
      playerObj[prop] = aggregateStatsObj[playerId][prop] ? aggregateStatsObj[playerId][prop] : 0;
    });
    finalObj[playerId] = playerObj;
  });
  return finalObj;
}

const flatten = (playerObj) => {
  const finalArray = [];
  Object.keys(playerObj).forEach(k => {
    finalArray.push(playerObj[k])
  });
  return finalArray;
};

const toCsv = (array) => {
  let csvString = '';

  // headers
  Object.keys(array[0]).forEach(k => {
    csvString += `,${k}`
  });
  csvString += '\n';

  array.forEach(e => {
    Object.keys(e).forEach(k => {
      csvString += `,${e[k]}`;
    });
    csvString += '\n';
  });

  return csvString;
}

const result = mergePlayersAndStats(players, stats);
// console.log("🚀 ~ file: mergePlayersAndStats.js:40 ~ result:", result)
const trimmed = trimStatsObj(result);
// console.log("🚀 ~ file: mergePlayersAndStats.js:41 ~ trimmed:", trimmed)

const flattened = flatten(trimmed);
// console.log("🚀 ~ file: mergePlayersAndStats.js:51 ~ flattened:", flattened)

const csvString = toCsv(flattened);
// console.log("🚀 ~ file: mergePlayersAndStats.js:75 ~ csvString:", csvString)

fs.writeFileSync('results.csv', csvString);
