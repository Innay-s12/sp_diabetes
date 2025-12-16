// config/database.js
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'diabetes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Buat connection pool
const pool = mysql.createPool(dbConfig);

// Fungsi query yang diexport NAMED export
export async function query(sql, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw new Error(`Database error: ${error.message}`);
    } finally {
        if (connection) connection.release();
    }
}

// Export default pool juga jika diperlukan
export default pool;