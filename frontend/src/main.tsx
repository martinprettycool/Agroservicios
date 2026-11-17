import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OperativosPage } from './pages/OperativosPage';
import { NuevoOperativoPage } from './pages/NuevoOperativoPage';
import { OperativoDetailPage } from './pages/OperativoDetailPage';
import { AppLayout } from './components/AppLayout';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/operativos" replace />} />
          <Route path="/operativos" element={<OperativosPage />} />
          <Route path="/operativos/nuevo" element={<NuevoOperativoPage />} />
          <Route path="/operativos/:operativoId" element={<OperativoDetailPage />} />
          <Route path="/operativos/:operativoId/registro" element={<NuevoOperativoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
