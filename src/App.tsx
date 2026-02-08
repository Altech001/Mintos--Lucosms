import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import PromoCodeManagementPage from "./pages/Admin/PromoCodeManagement";
import UserManagementPage from "./pages/Admin/UserManagement";
import UserServices from "./pages/Admin/UserServices";
import ForgotPasswordPage from "./pages/AuthPages/ForgotPassword";
import ResetPasswordPage from "./pages/AuthPages/ResetPasswordPage";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ContactGroups from "./pages/Contacts/ContactGroups";
import ComposePage from "./pages/Dashboard/Compose";
import Home from "./pages/Dashboard/Home";
import SpecialMge from "./pages/Dashboard/SpecialMge";
import ApiKeysPage from "./pages/Developer/ApiKeysPage";
import AutoTopUp from "./pages/Extension/Autotopup";
import Developer from "./pages/Extension/Developers";
import TicketsPage from "./pages/Extension/Tickets";
import ActivityLogs from "./pages/Logs/ActivityLogs";
import NotFound from "./pages/NoRoute/NotFound";
import Notifications from "./pages/Notifications/Notifications";
import ProfilePage from "./pages/Profile/Profile";
import Transactions from "./pages/Recents/Billings";
import RecentHistory from "./pages/Recents/RecentHistory";
import SettingsPage from "./pages/Settings/SettingsPage";
import ListTemplates from "./pages/Template/ListTemplates";
import Tage from "./pages/Template/Tage";
import Whatsapp from "./pages/UnderDev/Whatsapp";
import ApiDoc from "./pages/Docs/Docs";
import ShareCredits from "./pages/Share/sharecredits";
import Movies from "./pages/Movies/Movies";

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
              <Route path="/whatsappmsg" element={<Whatsapp />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/logs" element={<ActivityLogs />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/developer/api-keys" element={<ApiKeysPage />} />
              <Route path="/special-message" element={<SpecialMge />} />
              <Route path="/api_doc" element={<ApiDoc />} />
              <Route path="/share-credits" element={<ShareCredits />} />

            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/promo-codes" element={<PromoCodeManagementPage />} />
              <Route path="/admin/services" element={<UserServices />} />
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/movies" element={<Movies />} />
          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
