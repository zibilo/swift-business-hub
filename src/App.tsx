import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { WelcomeCover } from "@/components/WelcomeCover"; 
import { OfflinePage } from "@/components/OfflinePage"; // Import de la page hors-ligne

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Company from "./pages/Company";
import ImportExcel from "./pages/ImportExcel";
import ImportHistory from "./pages/ImportHistory";
import Support from "./pages/Support";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin Pages
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminImports from "./pages/admin/AdminImports";
import AdminSupport from "./pages/admin/AdminSupport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Limite les tentatives en cas d'erreur réseau
    },
  },
});

const App = () => {
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. LOGIQUE DE PREMIÈRE VUE (WELCOME)
    const hasSeenWelcome = localStorage.getItem("mucodec_seen_welcome");
    if (hasSeenWelcome) {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }

    // 2. LOGIQUE DE DÉTECTION INTERNET (OFFLINE)
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleWelcomeFinished = () => {
    localStorage.setItem("mucodec_seen_welcome", "true");
    setShowWelcome(false);
  };

  const handleRetryConnection = () => {
    if (navigator.onLine) {
      setIsOnline(true);
      window.location.reload();
    }
  };

  // Tant qu'on n'a pas vérifié le localStorage, on n'affiche rien (évite le flash blanc)
  if (showWelcome === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {/* Si l'utilisateur est hors-ligne, on bloque l'accès avec OfflinePage */}
          {!isOnline && <OfflinePage onRetry={handleRetryConnection} />}
          
          <Toaster />
          <Sonner />
          
          <BrowserRouter>
            <Routes>
              {/* Écran de bienvenue (Cover) */}
              <Route 
                path="/welcome" 
                element={
                  showWelcome ? (
                    <WelcomeCover onFinished={handleWelcomeFinished} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />

              <Route 
                path="/auth" 
                element={showWelcome ? <Navigate to="/welcome" replace /> : <Auth />} 
              />
              
              <Route
                path="/"
                element={
                  showWelcome ? (
                    <Navigate to="/welcome" replace />
                  ) : (
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  )
                }
              />
              
              {/* Autres routes protégées */}
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute><AppLayout><Company /></AppLayout></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><AppLayout><ImportExcel /></AppLayout></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AppLayout><ImportHistory /></AppLayout></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><AppLayout><Support /></AppLayout></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <AdminAuthProvider>
                    <Routes>
                      <Route path="login" element={<AdminLogin />} />
                      <Route element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="companies" element={<AdminCompanies />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="imports" element={<AdminImports />} />
                        <Route path="support" element={<AdminSupport />} />
                      </Route>
                    </Routes>
                  </AdminAuthProvider>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
