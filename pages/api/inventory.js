import { getPool } from '../../lib/db';

/**
 * Inventory API route. Supports GET to list all inventory items and POST to
 * create a new item. Each item includes a category and optional specs which
 * are stored as JSON strings.
 */
export default async function handler(req, res) {
  const pool = getPool();
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query('SELECT * FROM inventory');
      // parse specs JSON for client consumption
      const items = rows.map(row => ({ ...row, specs: row.specs ? JSON.parse(row.specs) : {} }));
      return res.status(200).json({ items });
    } catch (err) {
      console.error('Inventory GET error', err);
      return res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  } else if (req.method === 'POST') {
    const { item_name, category, hsn_sac, quantity, rate, specs } = req.body || {};
    if (!item_name || !category || !quantity || !rate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      const jsonSpecs = specs ? JSON.stringify(specs) : null;
      const [result] = await pool.query(
        'INSERT INTO inventory (item_name, category, hsn_sac, quantity, rate, specs) VALUES (?, ?, ?, ?, ?, ?)',
        [item_name, category, hsn_sac || null, quantity, rate, jsonSpecs]
      );
      return res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error('Inventory POST error', err);
      return res.status(500).json({ error: 'Failed to create inventory item' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}