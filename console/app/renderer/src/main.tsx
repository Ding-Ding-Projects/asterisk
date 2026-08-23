import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UpdateBanner } from './UpdateBanner';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

/* Mounted as its own root, deliberately outside the generated console shell: see
 * `UpdateBanner.tsx` for why a persistent, cross-screen banner has no home there. */
const bannerHost = document.createElement('div');
bannerHost.id = 'update-banner-host';
document.body.appendChild(bannerHost);
createRoot(bannerHost).render(<React.StrictMode><UpdateBanner /></React.StrictMode>);
