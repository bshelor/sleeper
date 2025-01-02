import { get } from './httpClient';
import * as db from './db';

const LEAGUE_ID = '1124462845103661056';

const main = async () => {
  await db.connect();

  let success = 0;
  let errored = 0;
  for (let i = 1; i < 19; i++) {
    const url = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/transactions/${i}`;
    console.log(`Requesting url: ${url}`);
    const transactions = await get(url);
    console.log(`Fetched ${transactions.length} transactions.`);
    for (const trx of transactions) {
      try {
        await db.upsert(
          'transactions',
          {
            status: trx.status,
            type: trx.type,
            creator_id: trx.creator,
            waiver_amount: trx.settings?.waiver_bid,
            add: trx.adds ? Object.keys(trx.adds)[0] : null,
            drop: trx.drops ? Object.keys(trx.drops)[0] : null,
            external_id: trx.transaction_id,
            timestamp: trx.created ? new Date(trx.created).toISOString() : null,
          },
          'update_transactions_script'
        );
        success++;
      } catch (err: any) {
        console.error(`Error upserting transaction record: ${err.message}`, { err: JSON.stringify(err) });
        errored++;
      }
    }
  }

  return { success, errored };
};

main()
  .then((val) => {
    console.log(`Imported ${val.success} transactions successfully`);
    if (val.errored) {
      console.warn(`Failed to import ${val.errored} transactions. See logs`);
    }
    process.exit(0);
  }).catch(err => {
    process.exit(1);
  });