import { getPool } from '../../lib/db';

/**
 * Reports API route. Accepts query params for `from` and `to` dates to filter
 * results. Returns aggregated sales, purchases and expenses totals and lists
 * of each when requested. The default case returns current month's summary.
 */
export default async function handler(req, res) {
  const pool = getPool();
  const { from, to, detail } = req.query || {};
  // Determine date range
  let fromDate, toDate;
  if (from && to) {
    fromDate = new Date(from);
    toDate = new Date(to);
  } else {
    // Default to current month
    const now = new Date();
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  try {
    // Format to YYYY-MM-DD for SQL
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];
    // Aggregate totals
    const [[salesAgg]] = await pool.query('SELECT IFNULL(SUM(grand_total),0) AS total_sales FROM sales WHERE date BETWEEN ? AND ?', [fromStr, toStr]);
    const [[purchaseAgg]] = await pool.query('SELECT IFNULL(SUM(quantity*rate),0) AS total_purchases FROM purchases WHERE date BETWEEN ? AND ?', [fromStr, toStr]);
    const [[expenseAgg]] = await pool.query('SELECT IFNULL(SUM(amount),0) AS total_expenses FROM expenses WHERE date BETWEEN ? AND ?', [fromStr, toStr]);
    const summary = {
      sales: parseFloat(salesAgg.total_sales),
      purchases: parseFloat(purchaseAgg.total_purchases),
      expenses: parseFloat(expenseAgg.total_expenses),
    };
    summary.netProfit = summary.sales - (summary.purchases + summary.expenses);
    if (detail === 'true') {
      // fetch lists too
      const [sales] = await pool.query('SELECT * FROM sales WHERE date BETWEEN ? AND ?', [fromStr, toStr]);
      const [purchases] = await pool.query('SELECT * FROM purchases WHERE date BETWEEN ? AND ?', [fromStr, toStr]);
      const [expenses] = await pool.query('SELECT * FROM expenses WHERE date BETWEEN ? AND ?', [fromStr, toStr]);
      return res.status(200).json({ summary, sales, purchases, expenses });
    }
    return res.status(200).json({ summary });
  } catch (err) {
    console.error('Reports error', err);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
}