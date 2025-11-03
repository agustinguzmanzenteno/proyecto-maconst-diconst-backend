const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();

pool.getConnection()
  .then((conn) => { conn.release(); console.log('Pool MySQL listo'); })
  .catch((err) => { console.error('Error conectando a MySQL:', err); });

module.exports = pool;