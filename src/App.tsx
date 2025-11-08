import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ForgotPasswordPage from "./pages/AuthPages/ForgotPassword";
import ResetPasswordPage from "./pages/AuthPages/ResetPasswordPage";
import ContactGroups from "./pages/Contacts/ContactGroups";
import ComposePage from "./pages/Dashboard/Compose";
import Home from "./pages/Dashboard/Home";
import AutoTopUp from "./pages/Extension/Autotopup";
import Developer from "./pages/Extension/Developers";
import TicketsPage from "./pages/Extension/Tickets";
import NotFound from "./pages/NoRoute/NotFound";
import Transactions from "./pages/Recents/Billings";
import RecentHistory from "./pages/Recents/RecentHistory";
import ListTemplates from "./pages/Template/ListTemplates";
import Tage from "./pages/Template/Tage";
import WapMessage from "./pages/Message/WapMessage";
import ProfilePage from "./pages/Profile/Profile";
import UserManagementPage from "./pages/Admin/UserManagement";
import PromoCodeManagementPage from "./pages/Admin/PromoCodeManagement";
import ApiKeysPage from "./pages/Developer/ApiKeysPage";
import SettingsPage from "./pages/Settings/SettingsPage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              {/* Pages */}
              <Route path="/composemsg" element={<ComposePage />} />
              <Route path="/tpage" element={<Tage />} />
              <Route path="/templates" element={<ListTemplates />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/developers" element={<Developer />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/billings" element={<Transactions />} />
              <Route path="/autotopup" element={<AutoTopUp />} />
              <Route path="/contacts" element={<ContactGroups />} />
              <Route path="/history" element={<RecentHistory />} />
              <Route path="/whatsappmsg" element={<WapMessage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/developer/api-keys" element={<ApiKeysPage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/promo-codes" element={<PromoCodeManagementPage />} />
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
