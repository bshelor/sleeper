import fs from 'fs';
import path from 'path';

import players from '../data/2023/players.json';
import projections from '../data/2023/projections.json';
import { mergeRecords, toCsv, flatten } from './utils';

/**
 * Calculate projections for the season. Currently targeted at 2023.
 */
export const calculate = () => {
  const playerFields = ['full_name', 'position', 'status', 'player_id'];
  const projectionFields = ['adp_ppr', 'pts_ppr'];
  const merged = mergeRecords(
    { data: players as Record<string, any>, fields: playerFields, conditions: { status: 'Active' } },
    { data: projections as Record<string, any>, fields: projectionFields, conditions: {} }
  );
  console.log(`Merged objects with ${Object.keys(merged).length} players`);

  const csvString = toCsv(flatten(merged));
  fs.writeFileSync(`${path.dirname(__dirname)}/../data/2023/mergedPredictions.csv`, csvString);
};

calculate();
