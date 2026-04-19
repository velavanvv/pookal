import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__content">
        <Topbar />
        <main className="container-fluid py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
