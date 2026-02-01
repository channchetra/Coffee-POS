import { join } from 'path';
const { Database } = await import('bun:sqlite');

const DB_PATH = join(process.cwd(), 'data', 'coffee-pos.db');
const db = new Database(DB_PATH);

const tables = db.query(`
  SELECT name FROM sqlite_master 
  WHERE type='table'
  ORDER BY name
`).all();

console.log('Tables in database:');
tables.forEach((t: any) => console.log(`  - ${t.name}`));

db.close();
