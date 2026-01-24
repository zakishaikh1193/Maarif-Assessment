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
    const migrationPath = path.join(__dirname, '../migrations/update_competency_code_length.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: update_competency_code_length.sql');
    console.log('📝 Updating competencies.code from VARCHAR(20) to VARCHAR(255)...');
    
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Competency code column updated to VARCHAR(255)');
    
    // Verify the column was updated
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM competencies WHERE Field = 'code'"
    );
    
    if (columns.length > 0) {
      console.log('✅ Column verified:', columns[0].Type);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('⚠️  Duplicate entry error - some competency codes may be too long for existing data');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();

