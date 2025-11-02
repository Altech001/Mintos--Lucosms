import { Route, BrowserRouter as Router, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ContactGroups from "./pages/Contacts/ContactGroups";
import ComposePage from "./pages/Dashboard/Compose";
import Home from "./pages/Dashboard/Home";
import AutoTopUp from "./pages/Extension/Autotopup";
import Developer from "./pages/Extension/Developers";
import Settings from "./pages/Extension/Settings";
import TicketsPage from "./pages/Extension/Tickets";
import NotFound from "./pages/NoRoute/NotFound";
import Transactions from "./pages/Recents/Billings";
import RecentHistory from "./pages/Recents/RecentHistory";
import ListTemplates from "./pages/Template/ListTemplates";
import Tage from "./pages/Template/Tage";
import WapMessage from "./pages/Message/WapMessage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />

            {/* Pages */}
            <Route path="/composemsg" element={<ComposePage />} />
            <Route path="/tpage" element={<Tage />} />
            <Route path="/templates" element={<ListTemplates />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/developers" element={<Developer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/billings" element={<Transactions />} />
            <Route path="/autotopup" element={<AutoTopUp />} />
            <Route path="/contacts" element={<ContactGroups />} />
            <Route path="/history" element={<RecentHistory />} />
            <Route path="/whatsappmsg" element={<WapMessage />} />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
