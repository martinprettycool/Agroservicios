import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  const [logoUnavailable, setLogoUnavailable] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <header className="site-header">
        <div className="brand">
          <div className="brand-logo">
            {logoUnavailable ? (
              <span className="brand-initials" aria-hidden="true">AS</span>
            ) : (
              <img src="/agrocalidad-logo.png" alt="Agrocalidad" onError={() => setLogoUnavailable(true)} />
            )}
          </div>
          <div className="brand-text">
            <span className="brand-name">AgroServicios</span>
            <span className="brand-subtitle">Sistema de Gestión de Inocuidad</span>
          </div>
        </div>
        <p className="header-context">Dirección de Inocuidad<br /><strong>Leche Cruda</strong></p>
      </header>
      <aside className="sidebar">
        <nav aria-label="Navegación principal">
          <p className="nav-label">Operaciones</p>
          <NavLink to="/operativos" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 3h6v4H9zM9 12h6M9 16h6" /></svg>
            Operativos
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="nav-label">AgroServicios</span>
          <p>Gestión de Inocuidad<br />de Leche Cruda</p>
        </div>
      </aside>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="content-container"><Outlet /></div>
      </main>
    </div>
  );
}
