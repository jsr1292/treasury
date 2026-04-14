import { json } from '@sveltejs/kit';
import 'dotenv/config';
import postgres from 'postgres';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const client = postgres(process.env.DATABASE_URL!);

  try {
    const tables = await client.unsafe(`
      SELECT t.table_name, t.table_schema
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);

    const columns = await client.unsafe(`
      SELECT c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const fks = await client.unsafe(`
      SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
             ccu.table_name AS to_table, ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);

    const schema = {
      tables: tables.map(t => ({
        name: t.table_name,
        columns: columns.filter(c => c.table_name === t.table_name).map(c => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default,
        })),
        foreignKeys: fks.filter(f => f.from_table === t.table_name).map(f => ({
          column: f.from_column,
          references: { table: f.to_table, column: f.to_column },
        })),
      }))
    };

    return { schema };
  } catch (e) {
    return { schema: { error: String(e), tables: [] } };
  } finally {
    await client.end();
  }
};
