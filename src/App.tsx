import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import RegisterPage from './pages/RegisterPage';
import { LanguageProvider } from './lib/language';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ProtectedRoute from './routes/ProtectedRoute';
import PermissionGuard from './routes/PermissionGuard';
import YearEndLockGuard from './routes/YearEndLockGuard';
import DashboardLayout from './layouts/DashboardLayout';
import OverviewPage from './pages/dashboard/OverviewPage';
import TransactionsPage from './pages/dashboard/TransactionsPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import DailyReportPage from './pages/reports/DailyReportPage';
import MonthlyReportPage from './pages/reports/MonthlyReportPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import PdfSettingsPage from './pages/settings/PdfSettings';
import MyPreferences from './pages/settings/MyPreferences';
import MasterDataPage from '@/pages/masterdata/MasterDataPage';
import MembersPage from './pages/MembersPage';
import MemberEntryPage from './pages/MemberEntryPage';
import MemberLogsPage from './pages/MemberLogsPage';
import BalanceSheet from './pages/account/BalanceSheetPage';
import SessionManagementPage from './pages/SessionManagementPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SessionLogsPage from './pages/SessionLogsPage';
import UpgradeNowPage from './pages/UpgradeNowPage';
import MasterAdminPage from './pages/admin/MasterAdminPage';
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
import MoneyDonationEntry from './pages/donations/MoneyDonationEntry';
import MoneyDonationList from './pages/donations/MoneyDonationList';
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
import CashflowByCategoryPage from './pages/ledger/CashflowByCategoryPage';
import CategoryStatementPage from './pages/ledger/CategoryStatementPage';
import JournalLogPage from './pages/reports/JournalLogPage';
import TrialBalancePage from './pages/reports/TrialBalancePage';
import BalanceSheetPage from './pages/reports/BalanceSheetPage';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
        <BrowserRouter>
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected Dashboard */}
              <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardLayout />}>
                  <Route
                    index
                    element={
                      <PermissionGuard requiredPermission="dashboard" accessLevel="view">
                        <OverviewPage />
                      </PermissionGuard>
                    }
                  />
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
                          <YearEndLockGuard>
                            <DonationProductEntry />
                          </YearEndLockGuard>
                        </PermissionGuard>
                      }
                    />
                  </Route>
                  <Route 
                    path="donations/money-entry" 
                    element={
                      <PermissionGuard requiredPermission="edit_donations" accessLevel="edit">
                        <YearEndLockGuard>
                          <MoneyDonationEntry />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route 
                    path="donations/money-list" 
                    element={
                      <PermissionGuard requiredPermission="view_donations" accessLevel="view">
                        <MoneyDonationList />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="upgrade-now"
                    element={
                      <PermissionGuard requiredPermission="dashboard" accessLevel="view">
                        <UpgradeNowPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="master-admin"
                    element={
                      <PermissionGuard requiredPermission="dashboard" accessLevel="view">
                        <MasterAdminPage />
                      </PermissionGuard>
                    }
                  />
                  <Route 
                    path="receipt/entry" 
                    element={
                      <PermissionGuard requiredPermission="receipts" accessLevel="edit">
                        <YearEndLockGuard>
                          <ReceiptEntryPage />
                        </YearEndLockGuard>
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
                    <Route 
                      index 
                      element={
                        <PermissionGuard requiredPermission="view_events" accessLevel="view">
                          <EventListView />
                        </PermissionGuard>
                      } 
                    />
                    <Route 
                      path="new" 
                      element={
                        <PermissionGuard requiredPermission="edit_events" accessLevel="edit">
                          <YearEndLockGuard>
                            <EventRegistrationForm />
                          </YearEndLockGuard>
                        </PermissionGuard>
                      } 
                    />
                    <Route 
                      path="edit/:id" 
                      element={
                        <PermissionGuard requiredPermission="edit_events" accessLevel="edit">
                          <YearEndLockGuard>
                            <EventRegistrationForm />
                          </YearEndLockGuard>
                        </PermissionGuard>
                      } 
                    />
                  </Route>
                  <Route 
                    path="calendar/new-moon-days" 
                    element={
                      <PermissionGuard requiredPermission="view_events" accessLevel="view">
                        <NewMoonDaysPage />
                      </PermissionGuard>
                    } 
                  />
                  <Route
                    path="master-data"
                    element={
                      <PermissionGuard requiredPermission="master_data" accessLevel="view">
                        <MasterDataPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="balance-sheet"
                    element={
                      <PermissionGuard requiredPermission="balance_sheet" accessLevel="view">
                        <BalanceSheet />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="registrations/entry"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <TempleUserEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="registrations/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <TempleUserEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="registrations/text-entry"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <TempleUserEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="registrations/list"
                    element={
                      <PermissionGuard requiredPermission="user_registrations" accessLevel="view">
                        <TempleUserListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="tax/entry"
                    element={
                      <PermissionGuard requiredPermission="tax_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <TaxUserEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="tax/list"
                    element={
                      <PermissionGuard requiredPermission="tax_registrations" accessLevel="view">
                        <TaxUserListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="tax/settings"
                    element={
                      <PermissionGuard requiredPermission="tax_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <TaxSettingsPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  
                  {/* Property Registration Routes */}
                  <Route
                    path="properties/*"
                    element={
                      <PermissionGuard requiredPermission="property_registrations" accessLevel="view">
                        <PropertyRoutes />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="kanikalar"
                    element={
                      <PermissionGuard requiredPermission="view_kanikalar" accessLevel="view">
                        <KanikalarPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="kanikalar/:id"
                    element={
                      <PermissionGuard requiredPermission="view_kanikalar" accessLevel="view">
                        <WeddingDetailPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="transactions"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="view">
                        <TransactionsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <ReportsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports/daily"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <DailyReportPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports/monthly"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <MonthlyReportPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports/journal-log"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <JournalLogPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports/trial-balance"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <TrialBalancePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="reports/balance-sheet"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <BalanceSheetPage />
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
                    path="settings/pdf"
                    element={
                      <PermissionGuard requiredPermission="pdf_settings" accessLevel="edit">
                        <PdfSettingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="settings/my-preferences"
                    element={
                      <PermissionGuard requiredPermission="setting" accessLevel="view">
                        <MyPreferences />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="members/entry"
                    element={
                      <PermissionGuard requiredPermission="member_entry" accessLevel="edit">
                        <YearEndLockGuard>
                          <MemberEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="members/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="member_entry" accessLevel="edit">
                        <YearEndLockGuard>
                          <MemberEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="members/logs"
                    element={
                      <PermissionGuard requiredPermission="view_session_logs" accessLevel="view">
                        <MemberLogsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="members"
                    element={
                      <PermissionGuard requiredPermission="member_entry" accessLevel="view">
                        <MembersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="marriage/entry"
                    element={
                      <PermissionGuard requiredPermission="marriage_register" accessLevel="edit">
                        <YearEndLockGuard>
                          <MarriageEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  {/* Ledger Routes */}
                  <Route
                    path="ledger/entry"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="edit">
                        <YearEndLockGuard>
                          <LedgerEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="ledger/entry/:id"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="edit">
                        <YearEndLockGuard>
                          <LedgerEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="ledger/list"
                    element={
                      <PermissionGuard requiredPermission="ledger_management" accessLevel="view">
                        <LedgerListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="ledger/profit-and-loss"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <ProfitAndLossPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="ledger/cashflow-by-category"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <CashflowByCategoryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="ledger/category-statement"
                    element={
                      <PermissionGuard requiredPermission="reports" accessLevel="view">
                        <CategoryStatementPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="marriage/list"
                    element={
                      <PermissionGuard requiredPermission="marriage_register" accessLevel="view">
                        <MarriageListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="hall/entry"
                    element={
                      <PermissionGuard requiredPermission="hall_booking" accessLevel="edit">
                        <YearEndLockGuard>
                          <HallEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="hall/approvals"
                    element={
                      <PermissionGuard requiredPermission="hall_approval" accessLevel="view">
                        <HallApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="hall/list"
                    element={
                      <PermissionGuard requiredPermission="marriage_register" accessLevel="view">
                        <HallListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="annadhanam/entry"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <AnnadhanamEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="annadhanam/new"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <AnnadhanamEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="annadhanam/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <AnnadhanamEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="annadhanam/list"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="view">
                        <AnnadhanamListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="annadhanam"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_registrations" accessLevel="view">
                        <AnnadhanamListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/entry"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <PoojaEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/new"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <PoojaEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/edit/:id"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="edit">
                        <YearEndLockGuard>
                          <PoojaEntryPage />
                        </YearEndLockGuard>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/list"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="view">
                        <PoojaListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja"
                    element={
                      <PermissionGuard requiredPermission="pooja_registrations" accessLevel="view">
                        <PoojaListView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/request"
                    element={
                      <PermissionGuard requiredPermission="pooja_mobile_submit" accessLevel="edit">
                        <PoojaMobileRequestPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/my-requests"
                    element={
                      <PermissionGuard requiredPermission="pooja_mobile_submit" accessLevel="view">
                        <PoojaMyRequestsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="pooja/approval"
                    element={
                      <PermissionGuard requiredPermission="pooja_approval" accessLevel="view">
                        <PoojaApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="annadhanam/approval"
                    element={
                      <PermissionGuard requiredPermission="annadhanam_approval" accessLevel="view">
                        <AnnadhanamApprovalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="donations/approval"
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
                    path="session-management"
                    element={
                      <PermissionGuard requiredPermission="session_management" accessLevel="view">
                        <SessionManagementPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="activity-logs"
                    element={
                      <PermissionGuard requiredPermission="activity_logs" accessLevel="view">
                        <ActivityLogsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="session-logs"
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
                {/* Legacy redirects for members module */}
                <Route
                  path="/members"
                  element={<Navigate to="/dashboard/members" replace />}
                />
                <Route
                  path="/members/entry"
                  element={<Navigate to="/dashboard/members/entry" replace />}
                />
                <Route
                  path="/members/edit/:id"
                  element={<Navigate to="/dashboard/members/edit/:id" replace />}
                />
                <Route
                  path="/members/logs"
                  element={<Navigate to="/dashboard/members/logs" replace />}
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
              {/* Catch-all route for unmatched paths */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;