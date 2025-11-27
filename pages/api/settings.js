import { getPool } from '../../lib/db';

/**
 * Settings API route. GET returns the company settings and user credentials.
 * POST updates the settings. The settings table is assumed to have a single
 * record (id=1). When updating, if no record exists one will be inserted.
 */
export default async function handler(req, res) {
  const pool = getPool();
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = 1');
      let settings = rows[0] || {};
      // Exclude password for security
      if (settings.password) delete settings.password;
      return res.status(200).json({ settings });
    } catch (err) {
      console.error('Settings GET error', err);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  } else if (req.method === 'POST') {
    const { company_name, address, city, state, zip, gstin, contact, bank_name, bank_account_name, bank_account_number, ifsc, branch, default_user, default_password } = req.body || {};
    try {
      // Upsert settings row
      const [rows] = await pool.query('SELECT id FROM company_settings WHERE id = 1');
      if (rows.length > 0) {
        await pool.query(
          `UPDATE company_settings SET company_name=?, address=?, city=?, state=?, zip=?, gstin=?, contact=?, bank_name=?, bank_account_name=?, bank_account_number=?, ifsc=?, branch=?, default_user=?, default_password=? WHERE id = 1`,
          [company_name || null, address || null, city || null, state || null, zip || null, gstin || null, contact || null, bank_name || null, bank_account_name || null, bank_account_number || null, ifsc || null, branch || null, default_user || null, default_password || null]
        );
      } else {
        await pool.query(
          `INSERT INTO company_settings (id, company_name, address, city, state, zip, gstin, contact, bank_name, bank_account_name, bank_account_number, ifsc, branch, default_user, default_password) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [company_name || null, address || null, city || null, state || null, zip || null, gstin || null, contact || null, bank_name || null, bank_account_name || null, bank_account_number || null, ifsc || null, branch || null, default_user || null, default_password || null]
        );
      }
      return res.status(200).json({ message: 'Settings updated' });
    } catch (err) {
      console.error('Settings POST error', err);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}