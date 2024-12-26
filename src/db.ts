import pg from 'pg';

const client = new pg.Client({
  user: 'brysonshelor',
  host: 'localhost',
  database: '2ez',
  port: 5432
});

export async function connect() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

export async function upsert(table: string, obj: Record<string, unknown>, audit: string) {
  Object.keys(obj).forEach(k => { // remove null or undefined values
    if (!obj[k]) { delete obj[k]; }
  });
  
  // TODO: make this way better lol
  const columns = [...Object.keys(obj), 'created_at', 'created_by'].join(', ');
  const values = Object.values(obj).map((v: any) => {
    if (Array.isArray(v)) { return `'{${v.map((i: string) => `"${i}"`).join(',')}}'`; } // format array type
    if (typeof v === 'string') {
      return `'${(v as any).replaceAll(`'`, `''`)}'`;
    }
    return `'${v}'`;
  }).join(', ');

  const conflictUpdateSql = Object.keys(obj).map(k => `${k}=EXCLUDED.${k}`).join(', ');
  const sql = `
    INSERT INTO ${table}(${columns})
    VALUES (${values}, '${new Date().toISOString()}', '${audit}')
    ON CONFLICT (external_id) DO UPDATE SET ${conflictUpdateSql}, modified_at='${new Date().toISOString()}', modified_by='${audit}'
  `;

  try {
    await client.query(sql);
  } catch (err: any) {
    console.error(`Error during upsert. ${err.message}`, { sql });
  }
}
