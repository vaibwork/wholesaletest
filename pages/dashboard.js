import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

/**
 * Dashboard page shows monthly summaries of sales, purchases, expenses and net
 * profit. A simple bar chart visualizes the totals across the current and
 * previous five months. Data is fetched from the /api/reports endpoint.
 */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ sales: 0, purchases: 0, expenses: 0, netProfit: 0 });
  const [chartData, setChartData] = useState({ labels: [], data: [] });

  useEffect(() => {
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

  useEffect(() => {
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
    <Layout>
      <Head>
        <title>Dashboard | VSOL-MiNi</title>
      </Head>
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
    </Layout>
  );
}