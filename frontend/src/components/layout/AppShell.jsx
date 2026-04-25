import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__body">
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
