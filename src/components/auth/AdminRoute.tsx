import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopProgressBar from "../ui/TopProgressBar";

export default function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <TopProgressBar message="Adminstrating ..." />;
  }

  if (!isAuthenticated || !user?.isSuperuser) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
