import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UpdateBanner } from './UpdateBanner';
import { PbxAdminWorkspace } from './PbxAdminWorkspace';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

/* Mounted as its own root, deliberately outside the generated console shell: see
 * `UpdateBanner.tsx` for why a persistent, cross-screen banner has no home there. */
const bannerHost = document.createElement('div');
bannerHost.id = 'update-banner-host';
document.body.appendChild(bannerHost);
createRoot(bannerHost).render(<React.StrictMode><UpdateBanner /></React.StrictMode>);

/*
 * FreePBX-style breadth is added beside the compiled console rather than by replacing
 * or hand-editing it. This follows the same additive-root pattern as UpdateBanner:
 * generated design output stays byte-identical to the checked-in reference, while this
 * workspace can use React state and the desktop control-plane bridge for the advanced
 * configuration/media/recovery surface.
 */
const adminHost = document.createElement('div');
adminHost.id = 'pbx-admin-workspace-host';
document.body.appendChild(adminHost);
createRoot(adminHost).render(<React.StrictMode><PbxAdminWorkspace /></React.StrictMode>);
