import { get } from './httpClient';
import * as db from './db';

const LEAGUE_ID = '1124462845103661056';

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
    playerPositionMap.set(p.position, [...(playerPositionMap.get(p.position) || []), matchupPlayer?.points || 0]);
  }
  console.log("🚀 ~ calculateTotalPossiblePoints ~ playerPositionMap:", playerPositionMap)

  const starters = players.filter(p => p.starter === true);
  let bestPossible = 0;
  for (const starter of starters) {

  }
};

const main = async () => {
  await db.connect();

  // const test = await db.get('transactions', { id: 2031 });
  // console.log("🚀 ~ main ~ test:", test)
  // return;

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
  for (let i = 1; i < 19; i++) {
    // if (i > 1) { break; }
    const url = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${i}`;
    console.log(`Requesting url: ${url}`);
    const matchups = await get(url);
    console.log(`Fetched ${matchups.length} matchups.`);
    
    let upsertedMatchup: any;
    for (const matchup of matchups) {
      try {
        const matchupObj = {
          roster_id: `${matchup.roster_id}`,
          week: i,
          external_id: `${matchup.matchup_id}`,
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