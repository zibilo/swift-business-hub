import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { WelcomeCover } from "@/components/WelcomeCover"; 
import { OfflinePage } from "@/components/OfflinePage";

// Importation du moteur de mise à jour hors-ligne (PWA)
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

// Pages Utilisateur (Client)
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
import AdminReferences from "./pages/admin/AdminReferences"; // NOUVEAU MODULE

// Modules Stratégiques Admin
import AdminFinance from "./pages/admin/AdminFinance";
import AdminFinancialEngine from "./pages/admin/AdminFinancialEngine";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminBudgeting from "./pages/admin/AdminBudgeting";
import AdminExecutiveReport from "./pages/admin/AdminExecutiveReport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // --- GESTION DU CACHE HORS-LIGNE (PWA) ---
  useRegisterSW({
    onRegistered(r) {
      r && r.update();
    },
  });

  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // --- 1. DÉTECTION HORS-LIGNE RENFORCÉE ---
    const updateOnlineStatus = () => {
      const status = navigator.onLine;
      setIsOnline(status);
      if (status) {
        document.body.classList.remove('offline-mode');
      } else {
        document.body.classList.add('offline-mode');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // --- 2. BLOCAGE DU ZOOM (Conformité Logiciel Pro) ---
    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault();
      }
    };

    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    document.addEventListener('touchstart', preventPinchZoom, { passive: false });
    document.addEventListener('keydown', preventKeyboardZoom);
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    // --- 3. GESTION DE L'ÉCRAN D'ACCUEIL (WELCOME) ---
    const hasSeenWelcome = localStorage.getItem("mucodec_seen_welcome");
    setShowWelcome(!hasSeenWelcome);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      document.removeEventListener('touchstart', preventPinchZoom);
      document.removeEventListener('keydown', preventKeyboardZoom);
      document.removeEventListener('wheel', preventWheelZoom);
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
    } else {
      toast.error("Échec de connexion", {
        description: "Le réseau est toujours indisponible."
      });
    }
  };

  if (showWelcome === null) return <div className="min-h-screen bg-[#F8FAFC]" />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          
          {/* Overlay de perte de connexion */}
          {!isOnline && <OfflinePage onRetry={handleRetryConnection} />}
          
          <Toaster />
          <Sonner position="top-center" richColors />
          
          <BrowserRouter>
            <Routes>
              {/* ACCUEIL & AUTHENTIFICATION */}
              <Route path="/welcome" element={showWelcome ? <WelcomeCover onFinished={handleWelcomeFinished} /> : <Navigate to="/" replace />} />
              <Route path="/auth" element={showWelcome ? <Navigate to="/welcome" replace /> : <Auth />} />
              
              {/* ESPACE CLIENT (PROTEGÉ) */}
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute><AppLayout><Company /></AppLayout></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><AppLayout><ImportExcel /></AppLayout></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AppLayout><ImportHistory /></AppLayout></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><AppLayout><Support /></AppLayout></ProtectedRoute>} />

              {/* ESPACE ADMINISTRATION (PROTEGÉ) */}
              <Route path="/admin/*" element={
                <AdminAuthProvider>
                  <Routes>
                    <Route path="login" element={<AdminLogin />} />
                    <Route element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="references" element={<AdminReferences />} /> {/* Route Référentiel */}
                      <Route path="companies" element={<AdminCompanies />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="imports" element={<AdminImports />} />
                      <Route path="finance-fees" element={<AdminFinance />} />
                      <Route path="finance-engine" element={<AdminFinancialEngine />} />
                      <Route path="compliance" element={<AdminCompliance />} />
                      <Route path="budget" element={<AdminBudgeting />} />
                      <Route path="report" element={<AdminExecutiveReport />} />
                      <Route path="support" element={<AdminSupport />} />
                    </Route>
                  </Routes>
                </AdminAuthProvider>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
