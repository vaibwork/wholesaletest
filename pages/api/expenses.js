import { getPool } from '../../lib/db';

/**
 * Expenses API route. GET lists all expenses; POST records a new expense.
 */
export default async function handler(req, res) {
  const pool = getPool();
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
      return res.status(200).json({ expenses: rows });
    } catch (err) {
      console.error('Expenses GET error', err);
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  } else if (req.method === 'POST') {
    const { description, amount, category, date } = req.body || {};
    if (!description || !amount) {
      return res.status(400).json({ error: 'Description and amount are required' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO expenses (description, amount, category, date) VALUES (?, ?, ?, ?)',
        [description, amount, category || null, date || new Date()]
      );
      return res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error('Expenses POST error', err);
      return res.status(500).json({ error: 'Failed to record expense' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}