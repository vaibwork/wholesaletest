import { getPool } from '../../lib/db';

/**
 * Purchase API route. GET lists all purchases, POST creates a new purchase and
 * updates inventory quantities accordingly. Input expects item_id and
 * quantity along with optional rate and tax fields.
 */
export default async function handler(req, res) {
  const pool = getPool();
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query('SELECT * FROM purchases ORDER BY date DESC');
      return res.status(200).json({ purchases: rows });
    } catch (err) {
      console.error('Purchase GET error', err);
      return res.status(500).json({ error: 'Failed to fetch purchases' });
    }
  } else if (req.method === 'POST') {
    const { item_id, quantity, rate, date, vendor_name, invoice_number, cgst, sgst, igst } = req.body || {};
    if (!item_id || !quantity || !rate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      // Start a transaction
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const purchaseInsert = 'INSERT INTO purchases (item_id, quantity, rate, date, vendor_name, invoice_number, cgst, sgst, igst) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const purchaseResult = await conn.query(purchaseInsert, [item_id, quantity, rate, date || new Date(), vendor_name || null, invoice_number || null, cgst || 0, sgst || 0, igst || 0]);
        // Update inventory quantity
        const updateInv = 'UPDATE inventory SET quantity = quantity + ? WHERE id = ?';
        await conn.query(updateInv, [quantity, item_id]);
        await conn.commit();
        return res.status(201).json({ id: purchaseResult[0].insertId });
      } catch (error) {
        await conn.rollback();
        console.error('Purchase POST transaction error', error);
        return res.status(500).json({ error: 'Failed to record purchase' });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error('Purchase POST error', err);
      return res.status(500).json({ error: 'Failed to record purchase' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}