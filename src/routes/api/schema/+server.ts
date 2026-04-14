import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import 'dotenv/config';
import postgres from 'postgres';

export const GET: RequestHandler = async () => {
  const client = postgres(process.env.DATABASE_URL!);

  try {
    // Get all tables
    const tables = await client.unsafe(`
      SELECT 
        t.table_name,
        t.table_schema
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);

    // Get all columns with types
    const columns = await client.unsafe(`
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    // Get foreign keys
    const fks = await client.unsafe(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    // Group columns by table
    const schema = tables.map(t => ({
      name: t.table_name,
      schema: t.table_schema,
      columns: columns
        .filter(c => c.table_name === t.table_name)
        .map(c => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default,
        })),
      foreignKeys: fks
        .filter(f => f.from_table === t.table_name)
        .map(f => ({
          column: f.from_column,
          references: { table: f.to_table, column: f.to_column },
        })),
    }));

    return json({ tables: schema });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  } finally {
    await client.end();
  }
};
