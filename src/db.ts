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

export async function get(table: string, whereObj: object) {
  const keys = Object.keys(whereObj);
  let whereStr = '';
  for (let i = 0; i < keys.length; i++) {
    if (i === 0) { // first one
      whereStr += `${keys[i]} = $${i + 1}`;
    } else {
      whereStr += ` AND ${keys[i]} = $${i + 1}`;
    }
  }
  const sql = `
    SELECT *
    FROM ${table}
    WHERE ${whereStr};
  `;

  const response = await client.query(sql, Object.values(whereObj));
  return response && response.rows ? response.rows[0] : undefined;
}

export async function update(table: string, id: string, updateObj: object, audit: string) {
  const updateStr = Object.entries(updateObj).map(([key, value]) => {
    if (Array.isArray(value)) { return `${key} = '{${value.map((i: string) => `"${i}"`).join(',')}}'`; } // format array type
    if (typeof value === 'string') {
      return `${key} = '${(value as any).replaceAll(`'`, `''`)}'`;
    }
    return `${key} = '${value}'`;
  }).join(', ');

  const sql = `
    UPDATE ${table}
    SET ${updateStr}, modified_at = '${new Date().toISOString()}', modified_by = '${audit}'
    WHERE id = ${id}
    RETURNING *
  `;
  const response = await client.query(sql);
  return response && response.rows ? response.rows[0] : undefined;
}

export async function create(table: string, obj: object, audit: string) {
  const columns = [...Object.keys(obj), 'created_at', 'created_by'].join(', ');
  const values = Object.values(obj).map((v: any) => {
    if (Array.isArray(v)) { return `'{${v.map((i: string) => `"${i}"`).join(',')}}'`; } // format array type
    if (typeof v === 'string') {
      return `'${(v as any).replaceAll(`'`, `''`)}'`;
    }
    return `'${v}'`;
  }).join(', ');

  const sql = `
    INSERT INTO ${table}(${columns})
    VALUES (${values}, '${new Date().toISOString()}', '${audit}')
    RETURNING *
  `;
  const response = await client.query(sql);
  return response && response.rows ? response.rows[0] : undefined;
}

export async function customUpsert(table: string, obj: Record<string, unknown>, whereObj: Record<string, unknown>, audit: string) {
  const record = await get(table, whereObj) as any as Record<string, unknown>;

  if (record) {
    const valuesChanged = Object.keys(record).some(key => {
      const valueToUpdate = obj[key];
      const existingValue = record[key];
      if (obj[key] && (obj[key] !== record[key as keyof typeof record])) { return true; }
      return false;
    });
      
    if (valuesChanged) {
      return await update(table, record.id as string, obj, audit);
    }
    return record;
  } else {
    return await create(table, obj, audit);
  }
}

export async function upsert(table: string, obj: Record<string, unknown>, audit: string, onConflict = 'external_id') {
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
    ON CONFLICT ( ${onConflict} ) DO UPDATE SET ${conflictUpdateSql}, modified_at='${new Date().toISOString()}', modified_by='${audit}'
    RETURNING *
  `;

  return await client.query(sql);
}
