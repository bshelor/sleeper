import { get } from './httpClient';
import * as db from './db';

const LEAGUE_ID = '1124462845103661056';

const main = async () => {
  await db.connect();

  const counts = {
    drafts: {
      success: 0,
      errored: 0,
    },
    draft_order: {
      success: 0,
      errored: 0,
    },
    draft_picks: {
      success: 0,
      errored: 0,
    }
  };

  const url = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/drafts`;
  console.log(`Requesting url: ${url}`);
  const drafts = await get(url);

  for (const draft of drafts) {
    // upsert draft info
    let createdDraft: any;
    try {
      createdDraft = await db.upsert(
        'drafts',
        {
          external_id: draft.draft_id,
          season: draft.season,
          seconds_per_pick: draft.settings?.pick_timer,
          qb_slots: draft.settings?.slots_qb,
          rb_slots: draft.settings?.slots_rb,
          wr_slots: draft.settings?.slots_wr,
          te_slots: draft.settings?.slots_te,
          flex_slots: draft.settings?.slots_flex,
          super_flex_slots: 0,
          k_slots: draft.settings?.slots_k,
          def_slots: draft.settings?.slots_def,
          bn_slots: draft.settings?.slots_bn,
          teams: draft.settings?.teams,
          started: draft.start_time ? new Date(draft.start_time).toISOString() : null,
          status: draft.status,
          type: draft.type
        },
        'upsert_draft_data_script'
      );
      counts.drafts.success += 1;
    } catch (err: any) {
      console.error(`Error upserting draft record: ${err.message}`, { err: JSON.stringify(err) });
      counts.drafts.errored += 1;
    }

    // upsert draft order info
    if (createdDraft) {
      const memberIds = [];
      for (const [memberId, pickPosition] of Object.entries(draft.draft_order)) {
        // to be used in draft picks section
        memberIds.push(memberId);

        try {
          await db.customUpsert(
            'draft_order',
            {
              draft_id: createdDraft.id,
              member_id: memberId,
              order: pickPosition,
            },
            {
              draft_id: createdDraft.id,
              member_id: memberId
            },
            'upsert_draft_data_script'
          );
          counts.draft_order.success += 1;
        } catch (err: any) {
          console.error(`Error upserting draft_order record: ${err.message}`, { err: JSON.stringify(err) });
          counts.draft_order.errored += 1;
        }
      }

      const url = `https://api.sleeper.app/v1/draft/${createdDraft.external_id}/picks`;
      console.log(`Requesting url: ${url}`);
      const draftPicks = await get(url)
      for (const pick of draftPicks) {
        try {
          await db.customUpsert(
            'draft_picks',
            {
              draft_id: createdDraft.id,
              team_id: pick.roster_id,
              player_id: pick.player_id,
              round: pick.round,
              pick: pick.pick_no,
            },
            {
              draft_id: createdDraft.id,
              round: pick.round,
              pick: pick.pick_no
            },
            'upsert_draft_data_script'
          );
          counts.draft_picks.success += 1;
        } catch (err: any) {
          console.error(`Error upserting draft_picks record: ${err.message}`, { err: JSON.stringify(err) });
          counts.draft_picks.errored += 1;
        }
      }

      const projectedStarters = new Map<string, object>();
      for (const id of memberIds) {
        const { rows: allPlayersForTeam } = await db.raw(`
          SELECT dp.player_id, dp.round, dp.pick, p.position
          FROM draft_picks dp
          INNER JOIN teams t on dp.team_id = t.external_id
          INNER JOIN members m on t.member_id = m.id
          INNER JOIN players p on dp.player_id = p.external_id
          WHERE m.external_id = '${id}'
          ORDER BY dp.round, dp.pick
        `);

        const psValues: Record<string, { max: number; values: string[] }> = {
          'QB': {
            max: 1,
            values: [],
          },
          'RB': {
            max: 2,
            values: [],
          },
          'WR': {
            max: 2,
            values: [],
          },
          'FLEX': {
            max: 2,
            values: [],
          },
          'TE': {
            max: 1,
            values: [],
          },
          'K': {
            max: 1,
            values: [],
          },
          'DEF': {
            max: 1,
            values: [],
          }
        };

        for (const player of allPlayersForTeam) {
          const position = player.position[0];
          const potentialSpot = psValues[position as keyof typeof psValues];
          if (!(potentialSpot.values.length >= potentialSpot.max)) {
            psValues[position as keyof typeof psValues].values.push(player.player_id);
          } else if (['WR', 'RB', 'TE'].includes(position)) {
            if (!(psValues.FLEX.values.length >= psValues.FLEX.max)) {
              psValues.FLEX.values.push(player.player_id);
            }
          }
        }

        projectedStarters.set(id, psValues);
        for (const [member, values] of Array.from(projectedStarters)) {
          for (const position of Object.keys(values)) {
            const playersToUpdate = (values[position as keyof typeof values] as { max: number; values: string[] }).values;
            for (const p of playersToUpdate) {
              await db.raw(`
                UPDATE draft_picks
                SET projected_starter = $1
                WHERE player_id = $2
              `, [true, p]);
            }
          }
        }
      }
    }
  }

  return counts;
};

main()
  .then((val) => {
    console.log(`Imported ${val.drafts.success} drafts successfully`);
    console.log(`Imported ${val.draft_order.success} draft_order records successfully`);
    console.log(`Imported ${val.draft_picks.success} draft_picks records successfully`);
    if (val.drafts.errored) {
      console.warn(`Failed to import ${val.drafts.errored} drafts. See logs`);
    }
    if (val.draft_order.errored) {
      console.warn(`Failed to import ${val.draft_order.errored} draft_order records. See logs`);
    }
    if (val.draft_picks.errored) {
      console.warn(`Failed to import ${val.draft_picks.errored} draft_picks records. See logs`);
    }
    process.exit(0);
  }).catch(err => {
    console.log(err);
    process.exit(1);
  });