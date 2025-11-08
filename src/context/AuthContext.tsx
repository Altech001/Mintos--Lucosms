import {
  createContext,
  useContext, // Add useContext import
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiClient, ApiClient } from "../lib/api/client";
import { UserPublic } from "../lib/api/models";

interface AuthContextType {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  apiClient: ApiClient;
  login: (email: string, password: string) => Promise<UserPublic | void>;
  register: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log("Attempting to check auth...");
    const token = apiClient.getToken();
    console.log("Token:", token);

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      console.log("Verifying token by fetching user data...");
      const response = await apiClient.api.users.usersReadUserMe();
      console.log("Auth check successful, user data:", response);
      setUser(response);
    } catch (error) {
      console.error("Auth check failed:", error);
      apiClient.clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log("Attempting to log in with email:", email);
    try {
      console.log("Calling login endpoint...");
      const response = await apiClient.api.login.loginLoginAccessToken({
        username: email,
        password: password,
      });
      apiClient.setToken(response.accessToken);
      const userData = await apiClient.api.users.usersReadUserMe();
      setUser(userData);
      // Return user data to confirm login was successful
      return userData;
    } catch (error: unknown) {
      console.error("Login failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials.";
      throw new Error(message);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    try {
      // Call register endpoint
      await apiClient.api.users.usersRegisterUser({
        userRegister: {
          email,
          password,
          fullName,
        },
      });

      // After successful registration, auto-login
      await login(email, password);
    } catch (error: unknown) {
      console.error("Registration failed:", error);
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      throw new Error(message);
    }
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
        apiClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}