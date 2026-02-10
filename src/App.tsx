import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { WelcomeCover } from "@/components/WelcomeCover"; // Importez le composant

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

const queryClient = new QueryClient();

const App = () => {
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu la page de garde
    const hasSeenWelcome = localStorage.getItem("mucodec_seen_welcome");
    if (hasSeenWelcome) {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeFinished = () => {
    localStorage.setItem("mucodec_seen_welcome", "true");
    setShowWelcome(false);
  };

  // Tant qu'on n'a pas vérifié le localStorage, on n'affiche rien (évite le flash)
  if (showWelcome === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Si c'est la première fois, on affiche la Cover, sinon on redirige vers /auth ou / */}
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
