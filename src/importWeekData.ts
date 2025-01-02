import { get } from './httpClient';
import * as db from './db';

const LEAGUE_ID = '1124462845103661056';

const seasonStartDates = {
  2024: '2024-09-03T04:00:00Z' // Tuesday at 4am UTC (12am ET)
};

const importDates = async (year: number) => {
  await db.connect();

  let success = 0;
  let errored = 0;
  const seasonStart = new Date(seasonStartDates[year as keyof typeof seasonStartDates]);
  for (let i = 0; i < 18; i++) {
    console.log(`Importing for week: ${i + 1}`);
    const thisWeekStart = new Date(seasonStart.toISOString());
    thisWeekStart.setDate(seasonStart.getDate() + (i * 7));
    const thisWeekEnd = new Date(seasonStart.toISOString());
    thisWeekEnd.setDate(seasonStart.getDate() + ((i + 1) * 7));

    thisWeekEnd.setHours(seasonStart.getHours() - 1);
    thisWeekEnd.setMinutes(59);
    thisWeekEnd.setSeconds(59);
    const dateStr = thisWeekEnd.toISOString();
    const weekData = {
      week: i + 1,
      year,
      start: thisWeekStart.toISOString(),
      end: dateStr
    }

    try {
      await db.customUpsert('weeks', weekData, { week: (i + 1), year }, 'update_weeks_script');
      success++;
    } catch (err: any) {
      console.error(`Error upserting weeks record: ${err.message}`, { err: JSON.stringify(err) });
      errored++;
    }
  }
  return { success, errored };
};

const main = async () => {
  const year = process.argv[2];

  if (!year) {
    throw new Error('`year` is required');
  }

  return await importDates(Number(year));
}

main()
  .then((val) => {
    console.log(`Imported ${val.success} weeks successfully`);
    if (val.errored) {
      console.warn(`Failed to import ${val.errored} weeks. See logs`);
    }
    process.exit(0);
  }).catch(err => {
    console.log(err.message);
    process.exit(1);
  });