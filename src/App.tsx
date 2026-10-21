/**
 * FindTrack — main app.
 * Routes between pages based on the active tab.
 */

import { useState } from 'react';
import { Shell } from './components/Shell';
import type { TabId } from './components/Shell';
import Home from './pages/Home';
import Devices from './pages/Devices';
import Tracking from './pages/Tracking';
import FinderMap from './pages/FinderMap';
import History from './pages/History';

export default function App() {
  const [tab, setTab] = useState<TabId>('home');

  return (
    <Shell tab={tab} onTab={setTab}>
      {tab === 'home' && <Home onNavigateToTracking={() => setTab('tracking')} />}
      {tab === 'devices' && <Devices onNavigateToTracking={() => setTab('tracking')} />}
      {tab === 'tracking' && <Tracking deviceId="ble-A42E5C118F23" onBack={() => setTab('home')} />}
      {tab === 'map' && <FinderMap />}
      {tab === 'history' && <History />}
    </Shell>
  );
}
