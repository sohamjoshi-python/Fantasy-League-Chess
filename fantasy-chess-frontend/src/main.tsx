import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';

const queryClient = new QueryClient();
const root = document.getElementById('root')!;

createRoot(root).render(
  !isSupabaseConfigured ? (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg rounded-lg border-2 border-royalBlue p-6 text-neutral-900">
        <h1 className="text-2xl font-bold mb-3">Local environment is not set</h1>
        <p className="text-neutral-700 mb-3">
          The app needs <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> in{' '}
          <code className="font-mono">fantasy-chess-frontend/.env</code>.
        </p>
        <ol className="list-decimal list-inside text-neutral-700 space-y-1 mb-3">
          <li>Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code></li>
          <li>Paste the project URL and publishable key from Supabase → Settings → API Keys</li>
          <li>Stop and restart <code className="font-mono">npm run dev</code></li>
        </ol>
        <p className="text-sm text-neutral-500">Vite only reads env files when the dev server starts.</p>
      </div>
    </div>
  ) : (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  ),
); 
