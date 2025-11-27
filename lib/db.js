import mysql from 'mysql2/promise';

// Singleton connection pool. We maintain one pool per application instance.
let pool;

/**
 * Returns a MySQL connection pool. If the pool does not yet exist it will be
 * created on first call. The pool configuration is taken from environment
 * variables defined in next.config.js or .env.local.
 */
export function getPool() {
  if (!pool) {
    // Pull configuration from environment variables if provided.  When
    // running locally or without explicit DB_* vars (e.g. on Vercel),
    // fallback to localhost defaults.  These defaults assume a MySQL
    // instance on the same machine with a root user and no password and a
    // database named "vsol_mini".  You can customise these values via
    // environment variables on the deployment platform.
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    const host = DB_HOST || 'localhost';
    const port = DB_PORT ? parseInt(DB_PORT) : 3306;
    const user = DB_USER || 'root';
    const password = DB_PASSWORD || '';
    const database = DB_NAME || 'vsol_mini';
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}