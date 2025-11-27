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