import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { MovieProvider } from "./context/MovieContext.tsx";
import { SeriesProvider } from "./context/SeriesContext.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MovieProvider>
              <SeriesProvider>
                <AppWrapper>
                  <App />
                </AppWrapper>
              </SeriesProvider>
            </MovieProvider>
          </ToastProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);