import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

/**
 * Purchase page lists recorded purchases and allows recording a new purchase.
 * When a purchase is saved the associated inventory quantity is increased.
 */
export default function Purchase() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState({ item_id: '', quantity: 0, rate: 0, date: '', vendor_name: '', invoice_number: '', cgst: 0, sgst: 0, igst: 0 });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, purRes] = await Promise.all([fetch('/api/inventory'), fetch('/api/purchase')]);
        const invData = await invRes.json();
        const purData = await purRes.json();
        if (invRes.ok) setItems(invData.items);
        if (purRes.ok) setPurchases(purData.purchases);
      } catch (err) {
        console.error('Purchase page load error', err);
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
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: parseInt(form.item_id),
          quantity: parseFloat(form.quantity),
          rate: parseFloat(form.rate),
          date: form.date || null,
          vendor_name: form.vendor_name || null,
          invoice_number: form.invoice_number || null,
          cgst: parseFloat(form.cgst) || 0,
          sgst: parseFloat(form.sgst) || 0,
          igst: parseFloat(form.igst) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Purchase recorded');
        setForm({ item_id: '', quantity: 0, rate: 0, date: '', vendor_name: '', invoice_number: '', cgst: 0, sgst: 0, igst: 0 });
        // Reload purchases and inventory
        const [invRes, purRes] = await Promise.all([fetch('/api/inventory'), fetch('/api/purchase')]);
        const invData = await invRes.json();
        const purData = await purRes.json();
        if (invRes.ok) setItems(invData.items);
        if (purRes.ok) setPurchases(purData.purchases);
      } else {
        setMessage(data.error || 'Error');
      }
    } catch (err) {
      console.error('Purchase record error', err);
      setMessage('Error recording purchase');
    }
  }

  return (
    <Layout>
      <Head>
        <title>Purchase | VSOL-MiNi</title>
      </Head>
      <h1 className="text-2xl font-semibold mb-4">Purchase</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">Record Purchase</h2>
        {message && <p className="text-sm mb-2 text-green-700">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Item</label>
              <select name="item_id" value={form.item_id} onChange={handleChange} required className="w-full px-2 py-1 border rounded">
                <option value="">Select item</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.item_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} step="0.01" required className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Rate per Unit (₹)</label>
              <input type="number" name="rate" value={form.rate} onChange={handleChange} step="0.01" required className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Vendor Name</label>
              <input type="text" name="vendor_name" value={form.vendor_name} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Invoice Number</label>
              <input type="text" name="invoice_number" value={form.invoice_number} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">CGST (₹)</label>
              <input type="number" name="cgst" value={form.cgst} onChange={handleChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">SGST (₹)</label>
              <input type="number" name="sgst" value={form.sgst} onChange={handleChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">IGST (₹)</label>
              <input type="number" name="igst" value={form.igst} onChange={handleChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Record Purchase</button>
        </form>
      </div>
      {/* Purchase list */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">Purchase History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : purchases.length === 0 ? (
          <p>No purchases found</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Rate</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Vendor</th>
                  <th className="px-2 py-2">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((pur, idx) => {
                  const item = items.find(i => i.id === pur.item_id) || {};
                  const amount = pur.quantity * pur.rate;
                  return (
                    <tr key={pur.id} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1">{idx + 1}</td>
                      <td className="px-2 py-1">{item.item_name || pur.item_id}</td>
                      <td className="px-2 py-1">{pur.quantity}</td>
                      <td className="px-2 py-1">₹ {pur.rate}</td>
                      <td className="px-2 py-1">₹ {amount.toFixed(2)}</td>
                      <td className="px-2 py-1">{pur.date ? new Date(pur.date).toLocaleDateString() : ''}</td>
                      <td className="px-2 py-1">{pur.vendor_name || '-'}</td>
                      <td className="px-2 py-1">{pur.invoice_number || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}