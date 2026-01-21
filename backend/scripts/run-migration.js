import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'map_assessment',
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/create_settings_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: create_settings_table.sql');
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Settings table created/updated');
    
    // Verify the table was created
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'settings'"
    );
    
    if (tables.length > 0) {
      const [rows] = await connection.query('SELECT * FROM settings WHERE id = 1');
      console.log('✅ Settings table verified:', rows.length > 0 ? 'Settings row exists' : 'Settings row missing');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();

