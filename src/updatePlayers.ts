import { players } from '../data/2024/players';
import * as db from './db';

const getAsciiNumber = (str: string) => {
  let final = 0;
  for (let i = 0; i < str.length; i++) {
    final += str.charCodeAt(i);
  }
  return final;
}

const main = async () => {
  await db.connect();
  // const members = await client.query('SELECT * FROM members');
  // console.log("🚀 ~ main ~ members:", members.rows);

  let success = 0;
  let errored = 0;
  for (const [id, player] of Object.entries(players)) {
    const newPlayer = player as any;
    try {
      const record = {
        first_name: newPlayer.first_name,
        last_name: newPlayer.last_name,
        active: newPlayer.active,
        position: newPlayer.fantasy_positions,
        team: newPlayer.team || undefined,
        external_id: id,
        status: newPlayer.status,
      };

      await db.upsert('players', record, 'update_players_script');
      success++;
    } catch (err: any) {
      console.error(`Error upserting player record: ${err.message}`, { err: JSON.stringify(err), player: JSON.stringify(player) });
      errored++;
    }
  }

  return { success, errored };
};

main()
  .then((val) => {
    console.log(`Upserted ${val.success} players successfully`);
    if (val.errored) {
      console.warn(`Failed to upsert ${val.errored} players. See logs`);
    }
    process.exit(0);
  }).catch(err => {
    process.exit(1);
  });