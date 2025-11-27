import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

/**
 * Settings page allows administrators to edit company information such as
 * address, GSTIN and banking details. It also exposes fields to update
 * default login credentials. Changes are persisted via the /api/settings
 * endpoint.
 */
export default function Settings() {
  const [settings, setSettings] = useState({
    company_name: '', address: '', city: '', state: '', zip: '', gstin: '', contact: '', bank_name: '', bank_account_name: '', bank_account_number: '', ifsc: '', branch: '', default_user: '', default_password: ''
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <Layout>
      <Head>
        <title>Settings | VSOL-MiNi</title>
      </Head>
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
    </Layout>
  );
}