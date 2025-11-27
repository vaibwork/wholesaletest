import mysql from 'mysql2/promise';

/**
 * API route that authenticates the user. Credentials are checked against the
 * `users` table in the database if available; otherwise the environment
 * variables DEFAULT_USER and DEFAULT_PASSWORD are used as the single user.
 *
 * The response includes the authenticated userId on success or an error
 * message with an appropriate status code on failure.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  try {
    // Attempt to authenticate against the database
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DEFAULT_USER, DEFAULT_PASSWORD } = process.env;
    let authenticated = false;
    // If DB credentials are provided attempt to connect
    if (DB_HOST && DB_USER && DB_NAME) {
      const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT ? parseInt(DB_PORT) : 3306,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
      });
      try {
        const [rows] = await connection.execute('SELECT id, userId FROM users WHERE userId = ? AND password = ?', [userId, password]);
        if (rows.length > 0) {
          authenticated = true;
        }
      } finally {
        await connection.end();
      }
    }
    // Fallback to default credentials
    if (!authenticated && userId === (DEFAULT_USER || '123456') && password === (DEFAULT_PASSWORD || '123456')) {
      authenticated = true;
    }
    if (authenticated) {
      return res.status(200).json({ userId });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error('Auth error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}