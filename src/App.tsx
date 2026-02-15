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
import { OfflinePage } from "@/components/OfflinePage";

// Pages Utilisateur
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Company from "./pages/Company";
import ImportExcel from "./pages/ImportExcel";
import ImportHistory from "./pages/ImportHistory";
import Support from "./pages/Support";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Pages Administration
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminImports from "./pages/admin/AdminImports";
import AdminSupport from "./pages/admin/AdminSupport";

// Nouveaux Modules Stratégiques Admin
import AdminFinance from "./pages/admin/AdminFinance";
import AdminFinancialEngine from "./pages/admin/AdminFinancialEngine";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminBudgeting from "./pages/admin/AdminBudgeting";
import AdminExecutiveReport from "./pages/admin/AdminExecutiveReport";

// Configuration globale des requêtes (Gestion du Failed to fetch)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Vérification de la première visite
    const hasSeenWelcome = localStorage.getItem("mucodec_seen_welcome");
    setShowWelcome(!hasSeenWelcome);

    // 2. Surveillance de la connexion Internet
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

  // Prévention du flash blanc pendant la lecture du localStorage
  if (showWelcome === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {/* Overlay de déconnexion globale */}
          {!isOnline && <OfflinePage onRetry={handleRetryConnection} />}
          
          <Toaster />
          <Sonner />
          
          <BrowserRouter>
            <Routes>
              {/* PAGE DE GARDE (AFFICHÉE UNE SEULE FOIS) */}
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

              {/* AUTHENTIFICATION */}
              <Route 
                path="/auth" 
                element={showWelcome ? <Navigate to="/welcome" replace /> : <Auth />} 
              />
              
              {/* ROUTES CLIENTS PROTÉGÉES */}
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
              
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute><AppLayout><Company /></AppLayout></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><AppLayout><ImportExcel /></AppLayout></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AppLayout><ImportHistory /></AppLayout></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><AppLayout><Support /></AppLayout></ProtectedRoute>} />

              {/* ROUTES ADMINISTRATION (Toutes les fonctions DG) */}
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
                        
                        {/* Nouveaux modules de pilotage */}
                        <Route path="finance-fees" element={<AdminFinance />} />
                        <Route path="finance-engine" element={<AdminFinancialEngine />} />
                        <Route path="compliance" element={<AdminCompliance />} />
                        <Route path="budget" element={<AdminBudgeting />} />
                        <Route path="report" element={<AdminExecutiveReport />} />
                        <Route path="support" element={<AdminSupport />} />
                      </Route>
                    </Routes>
                  </AdminAuthProvider>
                }
              />

              {/* ERREUR 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
