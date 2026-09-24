import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QueueProvider } from './context/QueueContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { NotificationModal } from './components/NotificationModal';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CustomerPage } from './pages/CustomerPage';
import { StaffPage } from './pages/StaffPage';
import { AdminPage } from './pages/AdminPage';
import { StatusCheckPage } from './pages/StatusCheckPage';
import { DisplayPage } from './pages/DisplayPage';

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isDisplayRoute = location.pathname === '/display';
  const isAdminRoute = location.pathname === '/admin';

  if (isDisplayRoute) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Routes>
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </main>
    );
  }

  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white">
        <NotificationModal />
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      <Navbar />
      <NotificationModal />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/status" element={<StatusCheckPage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <Router>
      <AuthProvider>
        <QueueProvider>
          <AppRoutes />
        </QueueProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
