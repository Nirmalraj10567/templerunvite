import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import RegisterPage from './pages/RegisterPage';
import { LanguageProvider } from './lib/language';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import DashboardLayout from './layouts/DashboardLayout';
import OverviewPage from './pages/dashboard/OverviewPage';
import TransactionsPage from './pages/dashboard/TransactionsPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import MasterDataPage from './pages/MasterDataPage';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* Protected Dashboard */}
            <Route element={<ProtectedRoute />}> 
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<OverviewPage />} />
                <Route
                  path="master-data"
                  element={
                    <RoleGuard roles={["admin", "superadmin"]}>
                      <MasterDataPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="transactions"
                  element={
                    <RoleGuard roles={["admin", "finance"]}>
                      <TransactionsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <RoleGuard roles={["admin", "finance"]}>
                      <ReportsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RoleGuard roles={["admin"]}>
                      <SettingsPage />
                    </RoleGuard>
                  }
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;