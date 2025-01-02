import { get } from './httpClient';
import * as db from './db';

/**
 * @description
 * Stats script to determine various alternate matchup results based on different conditions.
 */

const main = async () => {
  await db.connect();

  // const counts = {
  //   drafts: {
  //     success: 0,
  //     errored: 0,
  //   },
  //   draft_order: {
  //     success: 0,
  //     errored: 0,
  //   },
  //   draft_picks: {
  //     success: 0,
  //     errored: 0,
  //   }
  // };

  // const url = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/drafts`;
  // console.log(`Requesting url: ${url}`);
  // const drafts = await get(url);

  for (let week = 1; week < 18; week++) {
    const matchups = await db.getAll('matchups', { week });
    console.log("🚀 ~ main ~ matchups:", matchups)
    break;
    
  }
  // return counts;
};

main()
  .then((val) => {
    // console.log(`Imported ${val.drafts.success} drafts successfully`);
    // console.log(`Imported ${val.draft_order.success} draft_order records successfully`);
    // console.log(`Imported ${val.draft_picks.success} draft_picks records successfully`);
    // if (val.drafts.errored) {
    //   console.warn(`Failed to import ${val.drafts.errored} drafts. See logs`);
    // }
    // if (val.draft_order.errored) {
    //   console.warn(`Failed to import ${val.draft_order.errored} draft_order records. See logs`);
    // }
    // if (val.draft_picks.errored) {
    //   console.warn(`Failed to import ${val.draft_picks.errored} draft_picks records. See logs`);
    // }
    process.exit(0);
  }).catch(err => {
    console.log(err);
    process.exit(1);
  });