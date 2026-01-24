import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'map_assessment',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database query test passed');
    
    connection.release();
    return true;
  } catch (error) {
    console.error('\n❌ Database connection failed!\n');
    console.error('Error Details:');
    console.error('   Name:', error.name);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   SQL State:', error.sqlState);
    console.error('\nConnection Config (password hidden):');
    console.error('   Host:', dbConfig.host);
    console.error('   Port:', dbConfig.port);
    console.error('   User:', dbConfig.user);
    console.error('   Database:', dbConfig.database);
    console.error('   Password:', dbConfig.password ? '***' : '(empty)');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Issue: Connection refused');
      console.error('   - Database server may not be running');
      console.error('   - Wrong host or port');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Issue: Access denied');
      console.error('   - Wrong username or password');
      console.error('   - User does not have permission to access database');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Issue: Database does not exist');
      console.error('   - Database name is incorrect');
      console.error('   - Database needs to be created');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Issue: Cannot reach database host');
      console.error('   - Hostname is incorrect');
      console.error('   - Network/firewall issue');
    }
    
    console.error('\nStack Trace:');
    console.error(error.stack);
    return false;
  }
};

// Get connection from pool
export const getConnection = async () => {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw error;
  }
};

// Execute query with parameters
export const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Execute transaction
export const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params = [] } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export default pool;
