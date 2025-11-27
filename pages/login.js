import { useState } from 'react';
import { useRouter } from 'next/router';

/**
 * Login page for VSOL-MiNi. Uses a simple form that posts credentials to the
 * /api/auth endpoint. On success, the credentials are stored in localStorage
 * and the user is redirected to the dashboard. A default login is provided
 * through environment variables, but can be updated via the settings page.
 */
export default function Login() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

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