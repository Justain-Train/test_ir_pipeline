import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/tailwind.css';
import { AppLayout } from '@/components/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NewSessionPage } from './pages/NewSessionPage';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live-session" element={<NewSessionPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
