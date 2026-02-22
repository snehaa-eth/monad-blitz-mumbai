import React from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './lib/providers';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
