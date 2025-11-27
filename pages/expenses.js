import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

/**
 * Expenses page lists recorded expenses and provides a form to record new
 * expenses such as staff salary, utility bills and rent. The list is
 * automatically updated after adding a new expense.
 */
export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ description: '', amount: 0, category: '', date: '' });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/expenses');
        const data = await res.json();
        if (res.ok) setExpenses(data.expenses);
      } catch (err) {
        console.error('Expenses load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          amount: parseFloat(form.amount),
          category: form.category || null,
          date: form.date || null,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Expense recorded');
        setForm({ description: '', amount: 0, category: '', date: '' });
        // Reload expenses
        const r = await fetch('/api/expenses');
        const d = await r.json();
        if (r.ok) setExpenses(d.expenses);
      } else {
        setMessage(data.error || 'Error');
      }
    } catch (err) {
      console.error('Expense add error', err);
      setMessage('Error recording expense');
    }
  }

  return (
    <Layout>
      <Head>
        <title>Expenses | VSOL-MiNi</title>
      </Head>
      <h1 className="text-2xl font-semibold mb-4">Expenses</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">Record Expense</h2>
        {message && <p className="text-sm mb-2 text-green-700">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Description</label>
              <input type="text" name="description" value={form.description} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Amount (₹)</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Category</label>
              <input type="text" name="category" value={form.category} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Expense</button>
        </form>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">Expense List</h2>
        {loading ? (
          <p>Loading...</p>
        ) : expenses.length === 0 ? (
          <p>No expenses recorded</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">#</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1">Category</th>
                  <th className="border px-2 py-1">Amount</th>
                  <th className="border px-2 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, idx) => (
                  <tr key={exp.id} className="border-b">
                    <td className="border px-2 py-1">{idx + 1}</td>
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
    </Layout>
  );
}