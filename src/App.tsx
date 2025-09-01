import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import RegisterPage from './pages/RegisterPage';
import { LanguageProvider } from './lib/language';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import PermissionGuard from './routes/PermissionGuard';
import DashboardLayout from './layouts/DashboardLayout';
import OverviewPage from './pages/dashboard/OverviewPage';
import TransactionsPage from './pages/dashboard/TransactionsPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import MasterDataPage from '@/pages/masterdata/MasterDataPage';
import MembersPage from './pages/MembersPage';
import BalanceSheet from './pages/account/BalanceSheetPage';
import SessionManagementPage from './pages/SessionManagementPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SessionLogsPage from './pages/SessionLogsPage';
import { Navigation } from './components/Navigation';
import MarriageEntryPage from './pages/marriage/MarriageEntryPage';
import MarriageListPage from './pages/marriage/MarriageListPage';
import HallEntryPage from './pages/hall/HallEntryPage';
import HallListPage from './pages/hall/HallListPage';
import KanikalarPage from './pages/kanikalar/KanikalarPage';
import WeddingDetailPage from './pages/kanikalar/WeddingDetailPage';
import TempleUserEntryPage from './pages/registrations/TempleUserEntryPage';
import TempleUserListPage from './pages/registrations/TempleUserListPage';
import TaxUserEntryPage from './pages/tax/TaxUserEntryPage';
import TaxUserListPage from './pages/tax/TaxUserListPage';
import TaxSettingsPage from './pages/masterdata/TaxSettingsPage';
import PropertyRoutes from './pages/property';
import DonationProductList from './pages/product/DonationProductList';
import DonationProductEntry from './pages/product/DonationProductEntry';
import ReceiptEntryPage from './pages/Receipt /ReceiptEntryPage';
import ReceiptListPage from './pages/Receipt /ReceiptListPage';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard/donation-product/list" element={<DonationProductList />} />
              <Route path="/dashboard/donation-product/entry" element={<DonationProductEntry />} />
              <Route path="/dashboard/receipt/entry" element={<ReceiptEntryPage />} />
              <Route path="/dashboard/receipt/list" element={<ReceiptListPage />} />
              {/* Protected Dashboard */}
              <Route element={<ProtectedRoute />}> 
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<OverviewPage />} />
                  <Route
                    path="/dashboard/master-data"
                    element={
                      <PermissionGuard permissionId="master_data" requiredLevel="view">
                        <MasterDataPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/balance-sheet"
                    element={
                      <PermissionGuard permissionId="balance_sheet" requiredLevel="view">
                        <BalanceSheet />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/entry"
                    element={
                      <PermissionGuard permissionId="user_registrations" requiredLevel="edit">
                        <TempleUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/text-entry"
                    element={
                      <PermissionGuard permissionId="user_registrations" requiredLevel="edit">
                        <TempleUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/list"
                    element={
                      <PermissionGuard permissionId="user_registrations" requiredLevel="view">
                        <TempleUserListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/tax/entry"
                    element={
                      <PermissionGuard permissionId="tax_registrations" requiredLevel="edit">
                        <TaxUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/tax/list"
                    element={
                      <PermissionGuard permissionId="tax_registrations" requiredLevel="view">
                        <TaxUserListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/tax/settings"
                    element={
                      <PermissionGuard permissionId="tax_registrations" requiredLevel="edit">
                        <TaxSettingsPage />
                      </PermissionGuard>
                    }
                  />
                  
                  {/* Property Registration Routes */}
                  <Route
                    path="/dashboard/properties/*"
                    element={
                      <PermissionGuard permissionId="property_registrations" requiredLevel="view">
                        <PropertyRoutes />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/kanikalar"
                    element={
                      <PermissionGuard permissionId="view_kanikalar" requiredLevel="view">
                        <KanikalarPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/kanikalar/:id"
                    element={
                      <PermissionGuard permissionId="view_kanikalar" requiredLevel="view">
                        <WeddingDetailPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/transactions"
                    element={
                      <PermissionGuard permissionId="transaction" requiredLevel="view">
                        <TransactionsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <PermissionGuard permissionId="report" requiredLevel="view">
                        <ReportsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <PermissionGuard permissionId="setting" requiredLevel="view">
                        <SettingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/members"
                    element={
                      <PermissionGuard permissionId="member_entry" requiredLevel="view">
                        <MembersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/marriage/entry"
                    element={
                      <PermissionGuard permissionId="marriage_register" requiredLevel="edit">
                        <MarriageEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/marriage/list"
                    element={
                      <PermissionGuard permissionId="marriage_register" requiredLevel="view">
                        <MarriageListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/hall/entry"
                    element={
                      <PermissionGuard permissionId="marriage_register" requiredLevel="edit">
                        <HallEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/hall/list"
                    element={
                      <PermissionGuard permissionId="marriage_register" requiredLevel="view">
                        <HallListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/session-management"
                    element={
                      <PermissionGuard permissionId="session_management" requiredLevel="view">
                        <SessionManagementPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/activity-logs"
                    element={
                      <PermissionGuard permissionId="activity_logs" requiredLevel="view">
                        <ActivityLogsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/session-logs"
                    element={
                      <PermissionGuard permissionId="view_session_logs" requiredLevel="view">
                        <SessionLogsPage />
                      </PermissionGuard>
                    }
                  />
                </Route>
                {/* Legacy redirects for registrations module */}
                <Route
                  path="/registrations"
                  element={<Navigate to="/dashboard/registrations/list" replace />}
                />
                <Route
                  path="/registrations/entry"
                  element={<Navigate to="/dashboard/registrations/entry" replace />}
                />
                <Route 
                  path="/session-logs" 
                  element={
                    <PermissionGuard permissionId="view_session_logs" requiredLevel="view">
                      <SessionLogsPage />
                    </PermissionGuard>
                  }
                />
              </Route>
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;