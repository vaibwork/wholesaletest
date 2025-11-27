import { getPool } from '../../lib/db';

/**
 * Sales API route. GET lists all sales invoices, POST creates a new invoice
 * decreasing inventory quantities. The POST payload expects customer details
 * and an items array of { item_id, quantity, rate, hsn_sac, description }.
 */
export default async function handler(req, res) {
  const pool = getPool();
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query('SELECT * FROM sales ORDER BY date DESC');
      return res.status(200).json({ sales: rows });
    } catch (err) {
      console.error('Sales GET error', err);
      return res.status(500).json({ error: 'Failed to fetch sales' });
    }
  } else if (req.method === 'POST') {
    const { customer_name, customer_address, customer_gstin, place_of_supply, vehicle_no, items, taxes } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }
    try {
      // Compute totals
      let taxableTotal = 0;
      items.forEach(item => {
        taxableTotal += (item.rate || 0) * (item.quantity || 0);
      });
      const cgst = taxes?.cgst || 0;
      const sgst = taxes?.sgst || 0;
      const igst = taxes?.igst || 0;
      const grandTotal = taxableTotal + cgst + sgst + igst;
      // Start transaction
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // Determine next invoice number
        const [invRows] = await conn.query('SELECT COUNT(*) AS count FROM sales');
        const nextNumber = invRows[0].count + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`;
        const insertSale = 'INSERT INTO sales (invoice_number, customer_name, customer_address, customer_gstin, place_of_supply, vehicle_no, items, taxable_total, cgst, sgst, igst, grand_total, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const itemsJson = JSON.stringify(items);
        const now = new Date();
        await conn.query(insertSale, [invoiceNumber, customer_name || null, customer_address || null, customer_gstin || null, place_of_supply || null, vehicle_no || null, itemsJson, taxableTotal, cgst, sgst, igst, grandTotal, now]);
        // Update inventory: decrease quantities
        for (const item of items) {
          const q = item.quantity || 0;
          if (q > 0 && item.item_id) {
            await conn.query('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [q, item.item_id]);
          }
        }
        await conn.commit();
        return res.status(201).json({ invoice_number: invoiceNumber, grand_total: grandTotal });
      } catch (error) {
        await conn.rollback();
        console.error('Sales POST transaction error', error);
        return res.status(500).json({ error: 'Failed to create invoice' });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error('Sales POST error', err);
      return res.status(500).json({ error: 'Failed to create invoice' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}