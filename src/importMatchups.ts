import { get } from './httpClient';
import * as db from './db';

const LEAGUE_ID = '1124462845103661056';

/**
 * Returns the index of the max value in the array.
 * @param arr 
 */
const arrayMax = (arr: number[]) => {
  if (!arr.length) { return -1; }
  let maxIdx = -1;
  let maxValue = null;
  for (let i = 0; i < arr.length; i++) {
    if (maxValue === null || arr[i] > maxValue) {
      maxValue = arr[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

type MatchupPlayer = {
  points: number;
  player_id: string;
  starter: boolean;
};
const calculateTotalPossiblePoints = async (players: MatchupPlayer[]) => {
  const includeStr = players.map((_p, i) => `$${i + 1}`).join(', ');
  const { rows: playerPositions } = await db.raw(`
    SELECT position, external_id
    FROM players
    WHERE external_id IN (${includeStr})
  `, [...players.map(p => p.player_id)]);
  const playerPositionMap = new Map<string, number[]>();
  for (const p of playerPositions) {
    const matchupPlayer = players.find(pl => pl.player_id === p.external_id);
    playerPositionMap.set(p.position[0], [...(playerPositionMap.get(p.position[0]) || []), matchupPlayer?.points || 0]);
  }

  const positionTracking = {
    'QB': {
      max: 1,
      current: 0
    },
    'RB': {
      max: 2,
      current: 0
    },
    'WR': {
      max: 2,
      current: 0
    },
    'TE': {
      max: 1,
      current: 0
    },
    'FLEX': {
      max: 2,
      current: 0
    },
    'DEF': {
      max: 1,
      current: 0
    },
    'K': {
      max: 1,
      current: 0
    }
  };
  let bestPossiblePts = 0;
  for (const [key, value] of Array.from(playerPositionMap)) {
    const neededToFill = positionTracking[key as keyof typeof positionTracking];
    for (let i = 0; i < neededToFill.max; i++) {
      if (value.length) {
        bestPossiblePts += value.splice(arrayMax(value), 1)[0];
      }
    }
  }

  // fill FLEX positions with max possible of RB, WR, and TEs
  const remainingPointsForFlex = [
    ...playerPositionMap.get('RB') || [],
    ...playerPositionMap.get('WR') || [],
    ...playerPositionMap.get('TE') || [],
  ];
  for (let i = 0; i < positionTracking.FLEX.max; i++) {
    if (remainingPointsForFlex.length) {
      bestPossiblePts += remainingPointsForFlex.splice(arrayMax(remainingPointsForFlex), 1)[0];
    }
  }

  return bestPossiblePts;
};

const main = async () => {
  await db.connect();

  const counts = {
    matchups: {
      success: 0,
      errored: 0,
    },
    matchupPlayers: {
      success: 0,
      errored: 0,
    }
  };
  for (let i = 1; i < 18; i++) {
    const url = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${i}`;
    console.log(`Requesting url: ${url}`);
    const matchups = await get(url);
    console.log(`Fetched ${matchups.length} matchups.`);
    
    let upsertedMatchup: any;
    for (const matchup of matchups) {
      // indicates an invalid matchup in Sleeper API (like playoffs when you're out)
      if (matchup.matchup_id === null) {
        console.log(`Skipping matchup for roster_id: ${matchup.roster_id} in week ${i}. Invalid matchup detected.`);
        continue;
      }
      try {
        const matchupObj = {
          roster_id: matchup.roster_id,
          week: i,
          external_id: matchup.matchup_id,
          points: matchup.points
        }
        upsertedMatchup = await db.customUpsert(
          'matchups',
          matchupObj,
          { roster_id: matchup.roster_id, external_id: matchup.matchup_id, week: i },
          'update_matchups_script') as any;
        counts.matchups.success += 1;
      } catch (err: any) {
        console.error(`Error upserting matchup record: ${err.message}`, { err: JSON.stringify(err) });
        counts.matchups.errored += 1;
        continue;
      }

      try {
        if (matchup.players_points) {
          const players = Object.entries(matchup.players_points).reduce((acc, [playerId, points]) => {
            acc.push({
              matchup_id: upsertedMatchup.id,
              points,
              player_id: playerId,
              starter: matchup.starters ? matchup.starters.includes(playerId) : false,
            });
            return acc;
          }, [] as any);

          const totalPossiblePoints = await calculateTotalPossiblePoints(players);
          await db.raw(`UPDATE matchups SET best_possible_pts = $1 WHERE id = $2`, [totalPossiblePoints, upsertedMatchup.id]);

          console.log(`Upserting ${players.length} matchup players for matchup: ${upsertedMatchup.id}`)

          for (const p of players) {
            await db.customUpsert(
              'matchup_players',
              p,
              { matchup_id: upsertedMatchup.id, player_id: p.player_id },
              'update_matchups_script') as any;
            counts.matchupPlayers.success += 1;
          }
        }
      } catch (err: any) {
        console.error(`Error upserting matchup players record: ${err.message}`, { err: JSON.stringify(err) });
        counts.matchupPlayers.errored += 1;
      }
    }
  }

  return counts;
};

main()
  .then((val) => {
    console.log(`Imported ${val.matchups.success} matchups successfully`);
    console.log(`Imported ${val.matchupPlayers.success} matchup players successfully`);
    if (val.matchups.errored) {
      console.warn(`Failed to import ${val.matchups.errored} matchups. See logs`);
    }
    if (val.matchupPlayers.errored) {
      console.warn(`Failed to import ${val.matchupPlayers.errored} matchup players. See logs`);
    }
    process.exit(0);
  }).catch(err => {
    console.log(err);
    process.exit(1);
  });