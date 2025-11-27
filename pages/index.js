import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
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