import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';
import * as XLSX from 'xlsx';

/**
 * Reports page provides a consolidated view of sales, purchases and expenses
 * within a selected date range. Users can filter by month or custom dates
 * and export the detailed report to Excel. The API aggregates totals and
 * lists individual records when requested.
 */
export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ summary: { sales: 0, purchases: 0, expenses: 0, netProfit: 0 }, sales: [], purchases: [], expenses: [] });
  const [loading, setLoading] = useState(false);

  async function fetchReports(detail = true) {
    setLoading(true);
    try {
      let url = '/api/reports?detail=' + detail;
      if (from && to) {
        url += `&from=${from}&to=${to}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (res.ok) {
        setData({ summary: result.summary, sales: result.sales || [], purchases: result.purchases || [], expenses: result.expenses || [] });
      }
    } catch (err) {
      console.error('Report fetch error', err);
    } finally {
      setLoading(false);
    }
  }
  // Initial load: current month summary & details
  useEffect(() => {
    fetchReports(true);
  }, []);

  function handleExport() {
    // Combine sales, purchases and expenses into separate sheets
    const wb = XLSX.utils.book_new();
    if (data.sales && data.sales.length) {
      const salesSheet = XLSX.utils.json_to_sheet(data.sales);
      XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales');
    }
    if (data.purchases && data.purchases.length) {
      const purSheet = XLSX.utils.json_to_sheet(data.purchases);
      XLSX.utils.book_append_sheet(wb, purSheet, 'Purchases');
    }
    if (data.expenses && data.expenses.length) {
      const expSheet = XLSX.utils.json_to_sheet(data.expenses);
      XLSX.utils.book_append_sheet(wb, expSheet, 'Expenses');
    }
    const fileName = `report_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  return (
    <Layout>
      <Head>
        <title>Reports | VSOL-MiNi</title>
      </Head>
      <h1 className="text-2xl font-semibold mb-4">Reports</h1>
      {/* Date filter */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">Filter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 py-1 border rounded" />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2 py-1 border rounded" />
          </div>
          <div className="flex items-end">
            <button onClick={() => fetchReports(true)} className="bg-blue-500 text-white px-4 py-2 rounded">Apply</button>
          </div>
        </div>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-500">Total Sales</h3>
          <p className="text-xl font-semibold text-green-600">₹ {data.summary.sales?.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-500">Total Purchases</h3>
          <p className="text-xl font-semibold text-blue-600">₹ {data.summary.purchases?.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-500">Total Expenses</h3>
          <p className="text-xl font-semibold text-red-600">₹ {data.summary.expenses?.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-500">Net Profit</h3>
          <p className={`text-xl font-semibold ${data.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹ {data.summary.netProfit?.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex justify-end mb-2">
        <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded">Export to Excel</button>
      </div>
      {/* Tables */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-2">Sales</h3>
            {data.sales.length === 0 ? <p>No sales records</p> : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Invoice No</th>
                      <th className="border px-2 py-1">Customer</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.map(sale => (
                      <tr key={sale.id} className="border-b">
                        <td className="border px-2 py-1">{sale.invoice_number}</td>
                        <td className="border px-2 py-1">{sale.customer_name || '-'}</td>
                        <td className="border px-2 py-1">{sale.date ? new Date(sale.date).toLocaleDateString() : ''}</td>
                        <td className="border px-2 py-1">₹ {sale.grand_total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Purchases</h3>
            {data.purchases.length === 0 ? <p>No purchase records</p> : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Item</th>
                      <th className="border px-2 py-1">Quantity</th>
                      <th className="border px-2 py-1">Rate</th>
                      <th className="border px-2 py-1">Amount</th>
                      <th className="border px-2 py-1">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map(p => {
                      const amount = p.quantity * p.rate;
                      return (
                        <tr key={p.id} className="border-b">
                          <td className="border px-2 py-1">{p.item_id}</td>
                          <td className="border px-2 py-1">{p.quantity}</td>
                          <td className="border px-2 py-1">₹ {p.rate}</td>
                          <td className="border px-2 py-1">₹ {amount.toFixed(2)}</td>
                          <td className="border px-2 py-1">{p.date ? new Date(p.date).toLocaleDateString() : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Expenses</h3>
            {data.expenses.length === 0 ? <p>No expense records</p> : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Description</th>
                      <th className="border px-2 py-1">Category</th>
                      <th className="border px-2 py-1">Amount</th>
                      <th className="border px-2 py-1">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map(exp => (
                      <tr key={exp.id} className="border-b">
                        <td className="border px-2 py-1">{exp.description}</td>
                        <td className="border px-2 py-1">{exp.category || '-'}</td>
                        <td className="border px-2 py-1">₹ {exp.amount?.toFixed(2)}</td>
                        <td className="border px-2 py-1">{exp.date ? new Date(exp.date).toLocaleDateString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}