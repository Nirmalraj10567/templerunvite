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
import ReceiptEntryPage from './pages/receipts/ReceiptEntryPage';
import ReceiptListView from './pages/receipts/ReceiptListView';
import AnnadhanamEntryPage from './pages/annadhanam/AnnadhanamEntryPage';
import AnnadhanamListView from './pages/annadhanam/AnnadhanamListView';
import PoojaEntryPage from './pages/pooja/PoojaEntryPage';
import PoojaListView from './pages/pooja/PoojaListView';  
import PoojaApprovalPage from './pages/pooja/PoojaApprovalPage';
import AnnadhanamApprovalPage from './pages/annadhanam/AnnadhanamApprovalPage';
import DonationApprovalPage from './pages/donations/DonationApprovalPage';
import PoojaMobileRequestPage from './pages/pooja/PoojaMobileRequestPage';
import PoojaMyRequestsPage from './pages/pooja/PoojaMyRequestsPage';
import HallApprovalPage from './pages/hall/HallApprovalPage';
import EventRegistrationForm from './pages/events/EventRegistrationForm';
import EventListView from './pages/events/EventListView';
import NewMoonDaysPage from './pages/calendar/NewMoonDaysPage';
import LedgerEntryPage from './pages/ledger/LedgerEntryPage';
import LedgerListPage from './pages/ledger/LedgerListPage';
import ProfitAndLossPage from './pages/ledger/ProfitAndLossPage';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              {/* Protected Dashboard */}
              <Route element={<ProtectedRoute />}> 
                <Route path="dashboard" element={<DashboardLayout />}>
                  <Route index element={<OverviewPage />} />
                  <Route path="donation-product">
                    <Route 
                      path="list" 
                      element={
                        <PermissionGuard requiredPermission="view_donations" accessLevel="view">
                          <DonationProductList />
                        </PermissionGuard>
                      }
                    />
                    <Route 
                      path="entry" 
                      element={
                        <PermissionGuard requiredPermission="edit_donations" accessLevel="edit">
                          <DonationProductEntry />
                        </PermissionGuard>
                      }
                    />
                  </Route>
                  <Route 
                    path="receipt/entry" 
                    element={
                      <PermissionGuard requiredPermission="receipts" accessLevel="edit">
                        <ReceiptEntryPage />
                      </PermissionGuard>
                    } 
                  />
                  <Route 
                    path="receipt/list" 
                    element={
                      <PermissionGuard requiredPermission="receipts" accessLevel="view">
                        <ReceiptListView />
                      </PermissionGuard>
                    } 
                  />
                  <Route path="events">
                    <Route index element={<EventListView />} />
                    <Route path="new" element={<EventRegistrationForm />} />
                    <Route path="edit/:id" element={<EventRegistrationForm />} />
                  </Route>
                  <Route path="/dashboard/calendar/new-moon-days" element={<NewMoonDaysPage />} />
                  <Route
                    path="/dashboard/master-data"
                    element={
                      <PermissionGuard requiredPermission="master_data" accessLevel="view">
                        <MasterDataPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/balance-sheet"
                    element={
                      <PermissionGuard requiredPermission="balance_sheet" accessLevel="view">
                        <BalanceSheet />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/entry"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="edit">
                        <TempleUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="edit">
                        <TempleUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/text-entry"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="edit">
                        <TempleUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/registrations/list"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="view">
                        <TempleUserListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/tax/entry"
                    element={
                      <PermissionGuard requiredPermission="tax_registrations" accessLevel="edit">
                        <TaxUserEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/tax/list"
                    element={
                      <PermissionGuard requiredPermission="tax_registrations" accessLevel="view">
                        <TaxUserListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/tax/settings"
                    element={
                      <PermissionGuard requiredPermission="tax_registrations" accessLevel="edit">
                        <TaxSettingsPage />
                      </PermissionGuard>
                    }
                  />
                  
                  {/* Property Registration Routes */}
                  <Route
                    path="/dashboard/properties/*"
                    element={
                      <PermissionGuard requiredPermission="property_registrations" accessLevel="view">
                        <PropertyRoutes />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/kanikalar"
                    element={
                      <PermissionGuard requiredPermission="view_kanikalar" accessLevel="view">
                        <KanikalarPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/kanikalar/:id"
                    element={
                      <PermissionGuard requiredPermission="view_kanikalar" accessLevel="view">
                        <WeddingDetailPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/transactions"
                    element={
                      <PermissionGuard requiredPermission="transaction" accessLevel="view">
                        <TransactionsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <PermissionGuard requiredPermission="report" accessLevel="view">
                        <ReportsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <PermissionGuard requiredPermission="setting" accessLevel="view">
                        <SettingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/members"
                    element={
                      <PermissionGuard requiredPermission="member_entry" accessLevel="view">
                        <MembersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/marriage/entry"
                    element={
                      <PermissionGuard requiredPermission="marriage_register" accessLevel="edit">
                        <MarriageEntryPage />
                      </PermissionGuard>
                    }
                  />
                  {/* Ledger Routes */}
                  <Route
                    path="/dashboard/ledger/entry"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="edit">
                        <LedgerEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/ledger/entry/:id"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="edit">
                        <LedgerEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/ledger/list"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="view">
                        <LedgerListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/ledger/profit-and-loss"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <ProfitAndLossPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/marriage/list"
                    element={
                      <PermissionGuard requiredPermission="marriage_register" accessLevel="view">
                        <MarriageListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/hall/entry"
                    element={
                      <PermissionGuard requiredPermission="hall_booking" accessLevel="edit">
                        <HallEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/hall/approvals"
                    element={
                      <PermissionGuard requiredPermission="hall_approval" accessLevel="view">
                        <HallApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/hall/list"
                    element={
                      <PermissionGuard requiredPermission="marriage_register" accessLevel="view">
                        <HallListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/annadhanam/entry"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="edit">
                        <AnnadhanamEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/annadhanam/new"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="edit">
                        <AnnadhanamEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/annadhanam/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="edit">
                        <AnnadhanamEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/annadhanam/list"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="view">
                        <AnnadhanamListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/annadhanam"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="view">
                        <AnnadhanamListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/entry"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="edit">
                        <PoojaEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/new"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="edit">
                        <PoojaEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="edit">
                        <PoojaEntryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/list"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="view">
                        <PoojaListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="view">
                        <PoojaListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/request"
                    element={
                      <PermissionGuard requiredPermission="pooja_mobile_submit" accessLevel="edit">
                        <PoojaMobileRequestPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/my-requests"
                    element={
                      <PermissionGuard requiredPermission="pooja_mobile_submit" accessLevel="view">
                        <PoojaMyRequestsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/pooja/approval"
                    element={
                      <PermissionGuard requiredPermission="pooja_approval" accessLevel="view">
                        <PoojaApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/annadhanam/approval"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_approval" accessLevel="view">
                        <AnnadhanamApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/donations/approval"
                    element={
                      <PermissionGuard requiredPermission="donation_approval" accessLevel="view">
                        <DonationApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="view">
                        <Route
                          path="request"
                          element={<PoojaMobileRequestPage />}
                        />
                        <Route
                          path="my-requests"
                          element={<PoojaMyRequestsPage />}
                        />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/session-management"
                    element={
                      <PermissionGuard requiredPermission="session_management" accessLevel="view">
                        <SessionManagementPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/activity-logs"
                    element={
                      <PermissionGuard requiredPermission="activity_logs" accessLevel="view">
                        <ActivityLogsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dashboard/session-logs"
                    element={
                      <PermissionGuard requiredPermission="view_session_logs" accessLevel="view">
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
                    <PermissionGuard requiredPermission="view_session_logs" accessLevel="view">
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