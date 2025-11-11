import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopProgressBar from "../ui/TopProgressBar";
// import TopProgressBar from "../ui/TopProgressBar"; // Alternative option

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Option 1: Spinner (currently active)
    return <TopProgressBar message="Authenticating..." />;
    
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default ProtectedRoute;
