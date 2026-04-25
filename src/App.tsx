import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import StatusPage from './pages/StatusPage'
import AdminPage from './pages/AdminPage'
import ScannerPage from './pages/ScannerPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <div className="nav-brand">
  <img src="/logo.png" alt="PEAK Logo" style={{ height: 36, filter: 'invert(1)', marginRight: 10, verticalAlign: 'middle' }} />
  <span className="nav-brand-peak">PEAK</span>
  <span className="nav-brand-year">'25</span>
</div>
        </div>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Register
          </NavLink>
          <NavLink to="/status" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            My Ticket
          </NavLink>
          <NavLink to="/scan" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Scan
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active nav-link--admin' : 'nav-link nav-link--admin'}>
            Admin
          </NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/scan" element={<ScannerPage />} />
      </Routes>

      <style>{`
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          border-bottom: 1px solid var(--border);
          background: rgba(3,13,14,0.95);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-brand {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }
        .nav-brand-peak { color: var(--cyan); }
        .nav-brand-year { color: var(--text-muted); margin-left: 2px; }
        .nav-links { display: flex; align-items: center; gap: 4px; }
        .nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          padding: 7px 16px;
          border-radius: 6px;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .nav-link:hover { color: var(--text); background: var(--cyan-dim); }
        .nav-link.active { color: var(--cyan); background: var(--cyan-dim); }
        .nav-link--admin { color: var(--yellow); }
        .nav-link--admin:hover { color: var(--yellow); background: var(--yellow-dim); }
        .nav-link--admin.active { color: var(--yellow); background: var(--yellow-dim); }
        @media (max-width: 520px) {
          .nav-link { padding: 6px 10px; font-size: 12px; }
          .nav { padding: 12px 16px; }
        }
      `}</style>
    </BrowserRouter>
  )
}

export default App
