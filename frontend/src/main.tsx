import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OperativosPage } from './pages/OperativosPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <header className="site-header">
        <div className="container brand">
          <span className="brand-name">AgroServicios</span>
          <span className="brand-subtitle">Gestión de Inocuidad de Leche Cruda</span>
        </div>
      </header>
      <main className="container main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/operativos" replace />} />
          <Route path="/operativos" element={<OperativosPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>,
);
