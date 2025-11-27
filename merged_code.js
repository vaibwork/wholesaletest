// This file contains the combined source from the VSOL‑MiNi project.  Each
// section below is prefaced by a comment indicating the original file
// location.  The contents have been copied verbatim so that all of the
// application code can be viewed in a single place.  Note that this file
// is not intended to be executed directly—it is a reference to aid
// inspection and does not replace the modular structure of the original
// project.

/* ==== File: components/Layout.js ==== */
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

/**
 * Layout component wraps pages and provides a sidebar navigation. The sidebar
 * collapses on mobile devices and toggles via a hamburger button. Navigation
 * links are highlighted when active.
 */
export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Simple logout clears the session in localStorage and navigates to login
  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vsol-user');
    }
    router.push('/login');
  }

  // Protect all pages except login
  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('vsol-user') : null;
    if (!user && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [router]);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/purchase', label: 'Purchase' },
    { href: '/sales', label: 'Sales' },
    { href: '/reports', label: 'Reports' },
    { href: '/expenses', label: 'Expenses' },
    { href: '/settings', label: 'Settings' }
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className={`bg-white shadow-lg transition-all duration-300 fixed md:static z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 md:w-60 h-full`}>
        <div className="p-4 border-b">
          <h1 className="font-semibold text-lg text-blue-600">VSOL-MiNi</h1>
        </div>
        <nav className="mt-4 space-y-1">
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`block px-6 py-2 hover:bg-blue-100 ${router.pathname === item.href ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <button onClick={handleLogout} className="w-full text-left px-6 py-2 text-gray-700 hover:bg-red-100 hover:text-red-700">Logout</button>
        </nav>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black opacity-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Content area */}
      <div className="flex-1 ml-0 md:ml-60 overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 bg-white shadow md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600 focus:outline-none">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-blue-600">VSOL-MiNi</span>
          <div></div>
        </header>
        <main className="p-4 min-h-screen bg-gray-50">{children}</main>
      </div>
    </div>
  );
}

/* ==== File: lib/db.js ==== */
import mysql from 'mysql2/promise';

// Singleton connection pool. We maintain one pool per application instance.
let pool;

/**
 * Returns a MySQL connection pool. If the pool does not yet exist it will be
 * created on first call. The pool configuration is taken from environment
 * variables defined in next.config.js or .env.local.
 */
export function getPool() {
  if (!pool) {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
      throw new Error('Database connection details are not configured');
    }
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT ? parseInt(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

/* ==== File: pages/_app.js ==== */
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

/* ==== File: pages/index.js ==== */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('vsol-user') : null;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);
  return null;
}

/* ==== File: pages/dashboard.js ==== */
import { useEffect as useEffectDashboard, useState as useStateDashboard } from 'react';
import Layout as DashboardLayout from '../components/Layout';
import Head as DashboardHead from 'next/head';

/**
 * Dashboard page shows monthly summaries of sales, purchases, expenses and net
 * profit. A simple bar chart visualizes the totals across the current and
 * previous five months. Data is fetched from the /api/reports endpoint.
 */
export function Dashboard() {
  const [loading, setLoading] = useStateDashboard(true);
  const [summary, setSummary] = useStateDashboard({ sales: 0, purchases: 0, expenses: 0, netProfit: 0 });
  const [chartData, setChartData] = useStateDashboard({ labels: [], data: [] });

  useEffectDashboard(() => {
    async function fetchData() {
      try {
        // Fetch current month summary
        const res = await fetch('/api/reports');
        const data = await res.json();
        if (res.ok) {
          setSummary(data.summary);
        }
        // Fetch last 6 months data for chart
        const labels = [];
        const dataset = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const from = start.toISOString().split('T')[0];
          const to = end.toISOString().split('T')[0];
          const r = await fetch(`/api/reports?from=${from}&to=${to}`);
          const d = await r.json();
          const monthLabel = start.toLocaleString('default', { month: 'short', year: '2-digit' });
          labels.push(monthLabel);
          dataset.push(d.summary.netProfit);
        }
        setChartData({ labels, data: dataset });
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffectDashboard(() => {
    // Render bar chart once the data is loaded
    if (!loading && typeof window !== 'undefined' && chartData.labels.length > 0) {
      // Dynamically load Chart.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => {
        const ctx = document.getElementById('profitChart').getContext('2d');
        // eslint-disable-next-line no-undef
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: 'Net Profit',
                data: chartData.data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        });
      };
      document.body.appendChild(script);
    }
  }, [loading, chartData]);

  return (
    <DashboardLayout>
      <DashboardHead>
        <title>Dashboard | VSOL-MiNi</title>
      </DashboardHead>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-500">Total Sales</h3>
              <p className="text-2xl font-semibold text-green-600">₹ {summary.sales.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-500">Total Purchases</h3>
              <p className="text-2xl font-semibold text-blue-600">₹ {summary.purchases.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-500">Total Expenses</h3>
              <p className="text-2xl font-semibold text-red-600">₹ {summary.expenses.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-500">Net Profit</h3>
              <p className={`text-2xl font-semibold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹ {summary.netProfit.toFixed(2)}</p>
            </div>
          </div>
          {/* Bar chart */}
          <div className="bg-white p-4 rounded shadow h-64">
            <h3 className="text-sm text-gray-500 mb-2">Net Profit (last 6 months)</h3>
            <canvas id="profitChart" className="w-full h-full"></canvas>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ==== File: pages/login.js ==== */
import { useState as useStateLogin } from 'react';
import { useRouter as useRouterLogin } from 'next/router';

/**
 * Login page for VSOL-MiNi. Uses a simple form that posts credentials to the
 * /api/auth endpoint. On success, the credentials are stored in localStorage
 * and the user is redirected to the dashboard. A default login is provided
 * through environment variables, but can be updated via the settings page.
 */
export function Login() {
  const router = useRouterLogin();
  const [userId, setUserId] = useStateLogin('');
  const [password, setPassword] = useStateLogin('');
  const [error, setError] = useStateLogin(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vsol-user', JSON.stringify({ userId: data.userId }));
        }
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Unable to login. Please try again later.');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center text-blue-700">VSOL-MiNi Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label htmlFor="userId" className="block text-sm font-medium mb-1">User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
        </form>
      </div>
    </div>
  );
}

/* ==== File: pages/inventory.js ==== */
import { useEffect as useEffectInventory, useState as useStateInventory } from 'react';
import Layout as InventoryLayout from '../components/Layout';
import Head as InventoryHead from 'next/head';

/**
 * Inventory page allows viewing the list of stock items and adding new items.
 * Fields adapt based on the selected category to support various business
 * verticals including FMCG, garments, grocery and electronics. When a new
 * item is created it is persisted via the /api/inventory endpoint.
 */
export function Inventory() {
  const [items, setItems] = useStateInventory([]);
  const [loading, setLoading] = useStateInventory(true);
  const [form, setForm] = useStateInventory({
    item_name: '',
    category: '',
    hsn_sac: '',
    quantity: 0,
    rate: 0,
    specs: {},
  });
  const [message, setMessage] = useStateInventory(null);

  // Fetch inventory items on load
  useEffectInventory(() => {
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
    <InventoryLayout>
      <InventoryHead>
        <title>Inventory | VSOL-MiNi</title>
      </InventoryHead>
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
    </InventoryLayout>
  );
}

/* ==== File: pages/purchase.js ==== */
import { useEffect as useEffectPurchase, useState as useStatePurchase } from 'react';
import Layout as PurchaseLayout from '../components/Layout';
import Head as PurchaseHead from 'next/head';

/**
 * Purchase page lists recorded purchases and allows recording a new purchase.
 * When a purchase is saved the associated inventory quantity is increased.
 */
export function Purchase() {
  const [items, setItems] = useStatePurchase([]);
  const [purchases, setPurchases] = useStatePurchase([]);
  const [form, setForm] = useStatePurchase({ item_id: '', quantity: 0, rate: 0, date: '', vendor_name: '', invoice_number: '', cgst: 0, sgst: 0, igst: 0 });
  const [message, setMessage] = useStatePurchase(null);
  const [loading, setLoading] = useStatePurchase(true);

  useEffectPurchase(() => {
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
    <PurchaseLayout>
      <PurchaseHead>
        <title>Purchase | VSOL-MiNi</title>
      </PurchaseHead>
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
    </PurchaseLayout>
  );
}

/* ==== File: pages/reports.js ==== */
import { useEffect as useEffectReports, useState as useStateReports } from 'react';
import Layout as ReportsLayout from '../components/Layout';
import Head as ReportsHead from 'next/head';
import * as XLSX from 'xlsx';

/**
 * Reports page provides a consolidated view of sales, purchases and expenses
 * within a selected date range. Users can filter by month or custom dates
 * and export the detailed report to Excel. The API aggregates totals and
 * lists individual records when requested.
 */
export function Reports() {
  const [from, setFrom] = useStateReports('');
  const [to, setTo] = useStateReports('');
  const [data, setData] = useStateReports({ summary: { sales: 0, purchases: 0, expenses: 0, netProfit: 0 }, sales: [], purchases: [], expenses: [] });
  const [loading, setLoading] = useStateReports(false);

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
  useEffectReports(() => {
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
    <ReportsLayout>
      <ReportsHead>
        <title>Reports | VSOL-MiNi</title>
      </ReportsHead>
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
    </ReportsLayout>
  );
}

/* ==== File: pages/expenses.js ==== */
import { useEffect as useEffectExpenses, useState as useStateExpenses } from 'react';
import Layout as ExpensesLayout from '../components/Layout';
import Head as ExpensesHead from 'next/head';

/**
 * Expenses page lists recorded expenses and provides a form to record new
 * expenses such as staff salary, utility bills and rent. The list is
 * automatically updated after adding a new expense.
 */
export function Expenses() {
  const [expenses, setExpenses] = useStateExpenses([]);
  const [form, setForm] = useStateExpenses({ description: '', amount: 0, category: '', date: '' });
  const [message, setMessage] = useStateExpenses(null);
  const [loading, setLoading] = useStateExpenses(true);

  useEffectExpenses(() => {
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
    <ExpensesLayout>
      <ExpensesHead>
        <title>Expenses | VSOL-MiNi</title>
      </ExpensesHead>
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
    </ExpensesLayout>
  );
}

/* ==== File: pages/settings.js ==== */
import { useEffect as useEffectSettings, useState as useStateSettings } from 'react';
import Layout as SettingsLayout from '../components/Layout';
import Head as SettingsHead from 'next/head';

/**
 * Settings page allows administrators to edit company information such as
 * address, GSTIN and banking details. It also exposes fields to update
 * default login credentials. Changes are persisted via the /api/settings
 * endpoint.
 */
export function Settings() {
  const [settings, setSettings] = useStateSettings({
    company_name: '', address: '', city: '', state: '', zip: '', gstin: '', contact: '', bank_name: '', bank_account_name: '', bank_account_number: '', ifsc: '', branch: '', default_user: '', default_password: ''
  });
  const [message, setMessage] = useStateSettings(null);
  const [loading, setLoading] = useStateSettings(true);

  useEffectSettings(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (res.ok && data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      } catch (err) {
        console.error('Settings load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Settings updated successfully');
        // Update localStorage credentials if changed
        if (typeof window !== 'undefined') {
          localStorage.setItem('vsol-user', JSON.stringify({ userId: settings.default_user }));
        }
      } else {
        setMessage(data.error || 'Error updating settings');
      }
    } catch (err) {
      console.error('Settings update error', err);
      setMessage('Error updating settings');
    }
  }

  return (
    <SettingsLayout>
      <SettingsHead>
        <title>Settings | VSOL-MiNi</title>
      </SettingsHead>
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white p-4 rounded shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && <p className="text-green-700 text-sm">{message}</p>}
            <h2 className="text-lg font-medium mb-2">Company Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Company Name</label>
                <input type="text" name="company_name" value={settings.company_name} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">GSTIN</label>
                <input type="text" name="gstin" value={settings.gstin} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Contact</label>
                <input type="text" name="contact" value={settings.contact} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Address</label>
                <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">City</label>
                <input type="text" name="city" value={settings.city} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">State</label>
                <input type="text" name="state" value={settings.state} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Zip Code</label>
                <input type="text" name="zip" value={settings.zip} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
            </div>
            <h2 className="text-lg font-medium mt-4 mb-2">Bank Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Bank Name</label>
                <input type="text" name="bank_name" value={settings.bank_name} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">A/c Name</label>
                <input type="text" name="bank_account_name" value={settings.bank_account_name} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">A/c Number</label>
                <input type="text" name="bank_account_number" value={settings.bank_account_number} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">IFSC</label>
                <input type="text" name="ifsc" value={settings.ifsc} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Branch</label>
                <input type="text" name="branch" value={settings.branch} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
            </div>
            <h2 className="text-lg font-medium mt-4 mb-2">User Credentials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">User ID</label>
                <input type="text" name="default_user" value={settings.default_user} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Password</label>
                <input type="password" name="default_password" value={settings.default_password} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
              </div>
            </div>
            <button type="submit" className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Settings</button>
          </form>
        </div>
      )}
    </SettingsLayout>
  );
}

/* ==== File: pages/sales.js ==== */
import { useEffect as useEffectSales, useState as useStateSales, useRef } from 'react';
import Layout as SalesLayout from '../components/Layout';
import Head as SalesHead from 'next/head';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Sales page provides an interface to create tax invoices. It allows users
 * to select products from inventory, input customer details, auto-calculate
 * taxes and generate a PDF invoice which can be shared via WhatsApp. When
 * saved, the invoice is persisted to the database and inventory quantities
 * are decreased accordingly.
 */
export function Sales() {
  const [items, setItems] = useStateSales([]);
  const [form, setForm] = useStateSales({
    customer_name: '',
    customer_address: '',
    customer_gstin: '',
    place_of_supply: '',
    vehicle_no: '',
    items: [], // array of { item_id, description, hsn_sac, quantity, rate }
    taxes: { cgst: 0, sgst: 0, igst: 0 }
  });
  const [message, setMessage] = useStateSales(null);
  const [invoiceNumber, setInvoiceNumber] = useStateSales(null);
  const [lastInvoice, setLastInvoice] = useStateSales(null);
  const invoiceRef = useRef(null);

  useEffectSales(() => {
    // Load inventory items
    async function load() {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (res.ok) setItems(data.items);
      } catch (err) {
        console.error('Sales page load error', err);
      }
    }
    load();
  }, []);

  // Add a new invoice item row
  function addItem() {
    setForm(prev => ({ ...prev, items: [...prev.items, { item_id: '', description: '', hsn_sac: '', quantity: 0, rate: 0 }] }));
  }
  // Remove item row
  function removeItem(index) {
    setForm(prev => {
      const arr = [...prev.items];
      arr.splice(index, 1);
      return { ...prev, items: arr };
    });
  }
  // Update item field
  function handleItemChange(index, field, value) {
    setForm(prev => {
      const arr = [...prev.items];
      arr[index] = { ...arr[index], [field]: value };
      // If selecting item id, populate rate and description and hsn
      if (field === 'item_id') {
        const item = items.find(i => i.id === parseInt(value));
        if (item) {
          arr[index].rate = item.rate;
          arr[index].description = item.item_name;
          arr[index].hsn_sac = item.hsn_sac;
        }
      }
      return { ...prev, items: arr };
    });
  }
  // Handler for customer fields
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }
  // Handler for tax fields
  function handleTaxChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, taxes: { ...prev.taxes, [name]: value } }));
  }
  // Calculate totals
  function calculateTotals() {
    let taxable = 0;
    form.items.forEach(item => {
      taxable += (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 0);
    });
    const cgst = parseFloat(form.taxes.cgst) || 0;
    const sgst = parseFloat(form.taxes.sgst) || 0;
    const igst = parseFloat(form.taxes.igst) || 0;
    return { taxable, cgst, sgst, igst, grand: taxable + cgst + sgst + igst };
  }
  // Save invoice and generate PDF
  async function handleGenerate(e) {
    e.preventDefault();
    setMessage(null);
    const totals = calculateTotals();
    try {
      // Save invoice to DB first
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customer_name,
          customer_address: form.customer_address,
          customer_gstin: form.customer_gstin,
          place_of_supply: form.place_of_supply,
          vehicle_no: form.vehicle_no,
          items: form.items.map(it => ({
            item_id: parseInt(it.item_id),
            description: it.description,
            hsn_sac: it.hsn_sac,
            quantity: parseFloat(it.quantity),
            rate: parseFloat(it.rate)
          })),
          taxes: {
            cgst: parseFloat(form.taxes.cgst) || 0,
            sgst: parseFloat(form.taxes.sgst) || 0,
            igst: parseFloat(form.taxes.igst) || 0,
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setInvoiceNumber(data.invoice_number);
        // store details for sharing
        setLastInvoice({ customer_name: form.customer_name, grand: totals.grand });
        // After saving, generate PDF
        await generatePDF(data.invoice_number);
        setMessage('Invoice saved and PDF generated');
        // Reset form
        setForm({ customer_name: '', customer_address: '', customer_gstin: '', place_of_supply: '', vehicle_no: '', items: [], taxes: { cgst: 0, sgst: 0, igst: 0 } });
        // Refresh inventory because items sold changed quantities
        const invRes = await fetch('/api/inventory');
        const invData = await invRes.json();
        if (invRes.ok) setItems(invData.items);
      } else {
        setMessage(data.error || 'Error creating invoice');
      }
    } catch (err) {
      console.error('Invoice generation error', err);
      setMessage('Error creating invoice');
    }
  }
  // Generate PDF from invoice preview element using html2canvas & jsPDF
  async function generatePDF(invNo) {
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Fit image within page
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
    pdf.save(`${invNo || 'invoice'}.pdf`);
  }
  // Share invoice via WhatsApp (text only). This opens WhatsApp with prefilled text.
  function shareWhatsApp() {
    // Use last invoice details if available
    const customer = lastInvoice?.customer_name || form.customer_name;
    const amount = lastInvoice?.grand || calculateTotals().grand;
    const text = `Invoice ${invoiceNumber}\nCustomer: ${customer}\nAmount: ₹${amount?.toFixed(2)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  const totals = calculateTotals();

  return (
    <SalesLayout>
      <SalesHead>
        <title>Sales | VSOL-MiNi</title>
      </SalesHead>
      <h1 className="text-2xl font-semibold mb-4">Sales & Invoice</h1>
      {message && <p className="mb-4 text-green-700">{message}</p>}
      {/* Invoice creation form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">Create Invoice</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Customer details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Customer Name</label>
              <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Customer Address</label>
              <input type="text" name="customer_address" value={form.customer_address} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Customer GSTIN</label>
              <input type="text" name="customer_gstin" value={form.customer_gstin} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Place of Supply</label>
              <input type="text" name="place_of_supply" value={form.place_of_supply} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Vehicle No.</label>
              <input type="text" name="vehicle_no" value={form.vehicle_no} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          {/* Items table */}
          <div>
            <h3 className="text-sm font-medium mb-2">Items</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Item</th>
                    <th className="px-2 py-1">HSN/SAC</th>
                    <th className="px-2 py-1">Qty</th>
                    <th className="px-2 py-1">Rate</th>
                    <th className="px-2 py-1">Total</th>
                    <th className="px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, idx) => {
                    const total = (parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0);
                    return (
                      <tr key={idx} className="border-b">
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1">
                          <select value={it.item_id} onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)} className="border rounded px-1 py-0.5">
                            <option value="">Select</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>{item.item_name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input type="text" value={it.hsn_sac || ''} onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)} className="border rounded px-1 py-0.5 w-24" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" value={it.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} step="0.01" className="border rounded px-1 py-0.5 w-20" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" value={it.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} step="0.01" className="border rounded px-1 py-0.5 w-24" />
                        </td>
                        <td className="px-2 py-1">₹ {total.toFixed(2)}</td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-xs">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} className="mt-2 bg-blue-500 text-white px-3 py-1 rounded">Add Item</button>
          </div>
          {/* Tax inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">CGST (₹)</label>
              <input type="number" name="cgst" value={form.taxes.cgst} onChange={handleTaxChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">SGST (₹)</label>
              <input type="number" name="sgst" value={form.taxes.sgst} onChange={handleTaxChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">IGST (₹)</label>
              <input type="number" name="igst" value={form.taxes.igst} onChange={handleTaxChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save & PDF</button>
            {invoiceNumber && (
              <button type="button" onClick={shareWhatsApp} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Share via WhatsApp</button>
            )}
          </div>
        </form>
      </div>
      {/* Invoice preview */}
      <div className="bg-white p-4 rounded shadow" ref={invoiceRef} id="invoice-preview">
        <h2 className="text-lg font-medium mb-2 text-center">Tax Invoice</h2>
        <div className="flex justify-between text-sm">
          <div>
            <strong>Your Business Name</strong><br />
            {/* Add more company details if available via settings later */}
          </div>
          <div className="text-right">
            <div>Invoice No: {invoiceNumber || 'N/A'}</div>
            <div>Date: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
        {/* Customer & invoice details */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 text-sm gap-4">
          <div className="border p-2">
            <strong>Billed To (Buyer):</strong><br />
            {form.customer_name}<br />
            {form.customer_address}<br />
            {form.customer_gstin && (<span>GSTIN: {form.customer_gstin}</span>)}
          </div>
          <div className="border p-2">
            <strong>Invoice Details:</strong><br />
            {form.place_of_supply && (<span>Place of Supply: {form.place_of_supply}<br /></span>)}
            {form.vehicle_no && (<span>Vehicle No: {form.vehicle_no}</span>)}
          </div>
        </div>
        {/* Items table */}
        <table className="w-full text-xs mt-4 border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-1 py-1">S.No</th>
              <th className="border px-1 py-1">Description</th>
              <th className="border px-1 py-1">HSN/SAC</th>
              <th className="border px-1 py-1">Qty</th>
              <th className="border px-1 py-1">Rate</th>
              <th className="border px-1 py-1">Taxable Value</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, idx) => {
              const taxable = (parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0);
              return (
                <tr key={idx}>
                  <td className="border px-1 py-1 text-center">{idx + 1}</td>
                  <td className="border px-1 py-1">{it.description}</td>
                  <td className="border px-1 py-1">{it.hsn_sac}</td>
                  <td className="border px-1 py-1 text-right">{it.quantity}</td>
                  <td className="border px-1 py-1 text-right">{it.rate}</td>
                  <td className="border px-1 py-1 text-right">{taxable.toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Taxable Total</td>
              <td className="border px-1 py-1 text-right">{totals.taxable.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Add: CGST</td>
              <td className="border px-1 py-1 text-right">{totals.cgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Add: SGST</td>
              <td className="border px-1 py-1 text-right">{totals.sgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Add: IGST</td>
              <td className="border px-1 py-1 text-right">{totals.igst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-bold">Grand Total</td>
              <td className="border px-1 py-1 text-right font-bold">{totals.grand.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm">Amount in words: {numberToWords(Math.round(totals.grand))} only.</p>
      </div>
    </SalesLayout>
  );
}

// Helper function to convert numbers to words (simplified for rupees). This
// supports up to crores for typical invoice values. You could replace this
// implementation with a more robust library if needed.
function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
  const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];
  const g = [ '', 'Thousand', 'Lakh', 'Crore' ];
  function helper(n) {
    let str = '';
    if (n < 20) str = a[n];
    else if (n < 100) str = b[Math.floor(n/10)] + (n % 10 ? ' ' + a[n % 10] : '');
    else {
      str = a[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + helper(n % 100) : '');
    }
    return str;
  }
  if (num === 0) return 'Zero';
  let res = '';
  const parts = [];
  let i = 0;
  while (num > 0) {
    parts.push(num % 1000);
    num = Math.floor(num / 1000);
  }
  for (let idx = parts.length - 1; idx >= 0; idx--) {
    if (parts[idx]) {
      res += helper(parts[idx]) + (g[idx] ? ' ' + g[idx] + ' ' : '');
    }
  }
  return res.trim();
}

/* ==== File: pages/api/auth.js ==== */
import mysql as mysqlAuth from 'mysql2/promise';

/**
 * API route that authenticates the user. Credentials are checked against the
 * `users` table in the database if available; otherwise the environment
 * variables DEFAULT_USER and DEFAULT_PASSWORD are used as the single user.
 *
 * The response includes the authenticated userId on success or an error
 * message with an appropriate status code on failure.
 */
export async function handlerAuth(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  try {
    // Attempt to authenticate against the database
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DEFAULT_USER, DEFAULT_PASSWORD } = process.env;
    let authenticated = false;
    // If DB credentials are provided attempt to connect
    if (DB_HOST && DB_USER && DB_NAME) {
      const connection = await mysqlAuth.createConnection({
        host: DB_HOST,
        port: DB_PORT ? parseInt(DB_PORT) : 3306,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
      });
      try {
        const [rows] = await connection.execute('SELECT id, userId FROM users WHERE userId = ? AND password = ?', [userId, password]);
        if (rows.length > 0) {
          authenticated = true;
        }
      } finally {
        await connection.end();
      }
    }
    // Fallback to default credentials
    if (!authenticated && userId === (DEFAULT_USER || '123456') && password === (DEFAULT_PASSWORD || '123456')) {
      authenticated = true;
    }
    if (authenticated) {
      return res.status(200).json({ userId });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error('Auth error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/* ==== File: pages/api/expenses.js ==== */
import { getPool as getPoolExpenses } from '../../lib/db';

/**
 * Expenses API route. GET lists all expenses; POST records a new expense.
 */
export async function handlerExpenses(req, res) {
  const pool = getPoolExpenses();
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

/* ==== File: pages/api/inventory.js ==== */
import { getPool as getPoolInventory } from '../../lib/db';

/**
 * Inventory API route. Supports GET to list all inventory items and POST to
 * create a new item. Each item includes a category and optional specs which
 * are stored as JSON strings.
 */
export async function handlerInventory(req, res) {
  const pool = getPoolInventory();
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

/* ==== File: pages/api/purchase.js ==== */
import { getPool as getPoolPurchase } from '../../lib/db';

/**
 * Purchase API route. GET lists all purchases, POST creates a new purchase and
 * updates inventory quantities accordingly. Input expects item_id and
 * quantity along with optional rate and tax fields.
 */
export async function handlerPurchase(req, res) {
  const pool = getPoolPurchase();
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

/* ==== File: pages/api/reports.js ==== */
import { getPool as getPoolReports } from '../../lib/db';

/**
 * Reports API route. Accepts query params for `from` and `to` dates to filter
 * results. Returns aggregated sales, purchases and expenses totals and lists
 * of each when requested. The default case returns current month's summary.
 */
export async function handlerReports(req, res) {
  const pool = getPoolReports();
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

/* ==== File: pages/api/sales.js ==== */
import { getPool as getPoolSales } from '../../lib/db';

/**
 * Sales API route. GET lists all sales invoices, POST creates a new invoice
 * decreasing inventory quantities. The POST payload expects customer details
 * and an items array of { item_id, quantity, rate, hsn_sac, description }.
 */
export async function handlerSales(req, res) {
  const pool = getPoolSales();
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

/* ==== File: pages/api/settings.js ==== */
import { getPool as getPoolSettings } from '../../lib/db';

/**
 * Settings API route. GET returns the company settings and user credentials.
 * POST updates the settings. The settings table is assumed to have a single
 * record (id=1). When updating, if no record exists one will be inserted.
 */
export async function handlerSettings(req, res) {
  const pool = getPoolSettings();
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

/* ==== File: styles/globals.css ==== */
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

Custom global styles can go here
body {
  @apply bg-gray-50 text-gray-800;
}

Style scrollbars for better mobile experience
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0.2);
  border-radius: 4px;
}
*/