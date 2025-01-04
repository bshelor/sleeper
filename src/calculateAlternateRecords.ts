import * as db from './db';

/**
 * @description
 * Stats script to determine various alternate matchup results based on different conditions.
 */

type Matchup = {
  id: number;
  points: number;
  created_at: Date;
  created_by: string;
  modified_at: Date;
  modified_by: string;
  week: number;
  roster_id: string;
  external_id: string;
};

const calculateOriginalDraftRosterMatchup = async (values: Matchup[], draftPicks: Map<string, Set<string>>) => {
  for (const matchup of values) {
      const response = await db.raw(`
        SELECT mp.player_id, mp.points, p.position, m.external_id
        FROM draft_picks dp
        LEFT JOIN matchup_players mp on dp.player_id = mp.player_id
        LEFT JOIN matchups m on mp.matchup_id = m.id
        INNER JOIN players p on mp.player_id = p.external_id
        WHERE
          m.week = $1
          AND
          dp.projected_starter IS TRUE
          AND
          dp.team_id = $2
      `, [matchup.week, matchup.roster_id]);
      let matchupPlayers = response.rows;

      const pointValues: Record<string, { max: number; values: string[] }> = {
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
      
      // if original draft-projected starters doesn't equal a full roster, fill in the rest
      const includedPlayerIds = [];
      for (const mp of matchupPlayers) {
        let matched = false;
        for (const pos of mp.position) {
          const potentialSpot = pointValues[pos as keyof typeof pointValues];
          if (!(potentialSpot.values.length >= potentialSpot.max)) {
            pointValues[pos as keyof typeof pointValues].values.push(mp.points);
            matched = true;
            includedPlayerIds.push(mp.player_id);
            break;
          }
        }
        if (!matched && mp.position.some((p: string) => ['WR', 'RB', 'TE'].includes(p))) {
          if (!(pointValues.FLEX.values.length >= pointValues.FLEX.max)) {
            pointValues.FLEX.values.push(mp.points);
            includedPlayerIds.push(mp.player_id);
          }
        }
      }

      const remainingPositions = Object.keys(pointValues).reduce((positions, curr) => {
        const spots = pointValues[curr as keyof typeof pointValues];
        const spotsNeededToBeFilled = spots.max - spots.values.length;
        if (spotsNeededToBeFilled > 0) {
          positions.push({ needed: spotsNeededToBeFilled, pos: curr });
        }
        return positions;

      }, [] as { needed: number; pos: string }[]);
      const uniqueRemaining = Array.from(new Set(remainingPositions.map(p => p.pos)));

      if (uniqueRemaining.length) {
        const neededPositionStr = `(${uniqueRemaining.map((_v, i) => `$${i + 3}=ANY(p.position)`).join(' OR ')})`;
        const includedIdStr = includedPlayerIds.map((_v, i) => `$${i + 3 + uniqueRemaining.length}`).join(', ');
        const { rows: remainingStarters } = await db.raw(`
          SELECT mp.points, p.position
          FROM matchup_players mp
          LEFT JOIN matchups m on mp.matchup_id = m.id
          INNER JOIN players p on mp.player_id = p.external_id
          WHERE
            m.week = $1
            AND
            m.roster_id = $2
            AND ${neededPositionStr}
            AND mp.player_id NOT IN (${includedIdStr})
            AND mp.starter IS TRUE
        `, [
          matchup.week,
          matchup.roster_id,
          ...uniqueRemaining,
          ...includedPlayerIds
        ]);
        matchupPlayers = [...matchupPlayers, ...remainingStarters];
      }

      const totalPoints = matchupPlayers.reduce((acc, curr) => {
        acc += curr.points;
        return acc;
      }, 0);

      await db.customUpsert(
        'alternate_matchups',
        {
          points: totalPoints,
          week: matchup.week,
          roster_id: matchup.roster_id,
          external_id: matchup.external_id,
          type: 'original_draft'
        },
        {
          week: matchup.week, roster_id: matchup.roster_id, type: 'original_draft'
        },
        'calculate_original_draft_matchups_script'
      );
    // }
    // } else {
      // break;
    // }
  }
}

const compileDraftPicks = async (year: string) => {
  const map = new Map();
  const currentDraft = await db.getOne('drafts', { season: year });
  const draftPicks = await db.getAll('draft_picks', { draft_id: currentDraft.id });

  for (const pick of draftPicks) {
    const existing = map.get(pick.team_id);
    if (!existing) {
      map.set(pick.team_id, new Set([pick.player_id]));
    } else {
      existing.add(pick.player_id);
      map.set(pick.team_id, existing);
    }
  }

  return map;
};

const main = async () => {
  await db.connect();

  const draftPicks: Map<string, Set<string>> = await compileDraftPicks('2024');

  const originalMatchups = new Map();
  for (let week = 1; week < 18; week++) {
    const matchups = await db.getAll('matchups', { week });

    for (const matchup of matchups) {
      const existing = originalMatchups.get(`${matchup.external_id}_${matchup.week}`);
      if (!existing) {
        originalMatchups.set(`${matchup.external_id}_${matchup.week}`, [matchup]);
      } else {
        originalMatchups.set(`${matchup.external_id}_${matchup.week}`, [...existing, matchup]);
      }
    }

    for (const [_key, values] of Array.from(originalMatchups)) {
      await calculateOriginalDraftRosterMatchup(values, draftPicks);
    }
  }
  // return counts;
};

main()
  .then((val) => {
    console.log('Done calculating');
    process.exit(0);
  }).catch(err => {
    console.log(err);
    process.exit(1);
  });