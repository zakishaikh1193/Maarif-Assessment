// Debug script for cPanel hosting issues
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('=== cPanel Hosting Debug Script ===\n');

// Test 1: Environment Variables
console.log('1. Checking Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('');

// Test 2: Database Connection
console.log('2. Testing Database Connection:');
try {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  });

  console.log('✅ Database connection successful!');
  
  // Test a simple query
  const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
  console.log('✅ Database query successful! Users count:', rows[0].count);
  
  await connection.end();
} catch (error) {
  console.log('❌ Database connection failed:');
  console.log('Error:', error.message);
  console.log('Code:', error.code);
  console.log('');
}

// Test 3: File System
console.log('3. Testing File System:');
try {
  const fs = await import('fs/promises');
  const currentDir = await fs.readdir('.');
  console.log('✅ Current directory readable');
  console.log('Files in current directory:', currentDir.length);
  
  // Check if .env file exists
  try {
    await fs.access('.env');
    console.log('✅ .env file exists');
  } catch {
    console.log('❌ .env file not found');
  }
} catch (error) {
  console.log('❌ File system error:', error.message);
}

// Test 4: Node.js Version
console.log('\n4. Node.js Information:');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test 5: Memory Usage
console.log('\n5. Memory Usage:');
const memUsage = process.memoryUsage();
console.log('RSS:', Math.round(memUsage.rss / 1024 / 1024), 'MB');
console.log('Heap Used:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
console.log('Heap Total:', Math.round(memUsage.heapTotal / 1024 / 1024), 'MB');

console.log('\n=== Debug Complete ===');

