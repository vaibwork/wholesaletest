import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

/**
 * Inventory page allows viewing the list of stock items and adding new items.
 * Fields adapt based on the selected category to support various business
 * verticals including FMCG, garments, grocery and electronics. When a new
 * item is created it is persisted via the /api/inventory endpoint.
 */
export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    item_name: '',
    category: '',
    hsn_sac: '',
    quantity: 0,
    rate: 0,
    specs: {},
  });
  const [message, setMessage] = useState(null);

  // Fetch inventory items on load
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (res.ok) {
          setItems(data.items);
        }
      } catch (err) {
        console.error('Inventory fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Handler for field changes
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // Handler for spec field changes
  function handleSpecChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, specs: { ...prev.specs, [name]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: form.item_name,
          category: form.category,
          hsn_sac: form.hsn_sac,
          quantity: parseFloat(form.quantity),
          rate: parseFloat(form.rate),
          specs: form.specs,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ item_name: '', category: '', hsn_sac: '', quantity: 0, rate: 0, specs: {} });
        setMessage('Item added successfully');
        // Reload inventory list
        const newRes = await fetch('/api/inventory');
        const newData = await newRes.json();
        setItems(newData.items);
      } else {
        setMessage(data.error || 'Error adding item');
      }
    } catch (err) {
      console.error('Add item error', err);
      setMessage('Error adding item');
    }
  }

  // Render category specific fields
  function renderSpecFields() {
    const { category } = form;
    switch (category) {
      case 'FMCG':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Cartons</label>
              <input type="number" name="cartons" value={form.specs.cartons || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Items per Carton</label>
              <input type="number" name="items_per_carton" value={form.specs.items_per_carton || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
        );
      case 'Garments':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Type of Garment</label>
              <input type="text" name="type" value={form.specs.type || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Rack/Location</label>
              <input type="text" name="rack" value={form.specs.rack || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
        );
      case 'Grocery':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Bags</label>
              <input type="number" name="bags" value={form.specs.bags || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Weight per Bag (kg)</label>
              <input type="number" step="0.01" name="weight_per_bag" value={form.specs.weight_per_bag || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
        );
      case 'Electronics':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Brand</label>
              <input type="text" name="brand" value={form.specs.brand || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Warranty (months)</label>
              <input type="number" name="warranty" value={form.specs.warranty || ''} onChange={handleSpecChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Layout>
      <Head>
        <title>Inventory | VSOL-MiNi</title>
      </Head>
      <h1 className="text-2xl font-semibold mb-4">Inventory</h1>
      {/* Add Item Form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">Add New Item</h2>
        {message && <p className="text-sm mb-2 text-green-600">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Item Name</label>
              <input type="text" name="item_name" value={form.item_name} onChange={handleChange} required className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Category</label>
              <select name="category" value={form.category} onChange={handleChange} required className="w-full px-2 py-1 border rounded">
                <option value="">Select category</option>
                <option value="FMCG">FMCG</option>
                <option value="Garments">Garments</option>
                <option value="Grocery">Grocery</option>
                <option value="Electronics">Electronics</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">HSN/SAC</label>
              <input type="text" name="hsn_sac" value={form.hsn_sac} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Opening Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} step="0.01" required className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Rate per Unit (₹)</label>
              <input type="number" name="rate" value={form.rate} onChange={handleChange} step="0.01" required className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          {renderSpecFields()}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Item</button>
        </form>
      </div>
      {/* Inventory list */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">Stock List</h2>
        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>No items found</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">HSN/SAC</th>
                  <th className="px-2 py-2">Quantity</th>
                  <th className="px-2 py-2">Rate</th>
                  <th className="px-2 py-2">Specs</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1">{idx + 1}</td>
                    <td className="px-2 py-1">{item.item_name}</td>
                    <td className="px-2 py-1">{item.category}</td>
                    <td className="px-2 py-1">{item.hsn_sac || '-'}</td>
                    <td className="px-2 py-1">{item.quantity}</td>
                    <td className="px-2 py-1">₹ {item.rate}</td>
                    <td className="px-2 py-1 text-xs">{item.specs ? JSON.stringify(item.specs) : '-'}</td>
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