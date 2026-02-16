import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner"; // Import de toast pour les alertes réseau
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { WelcomeCover } from "@/components/WelcomeCover"; 
import { OfflinePage } from "@/components/OfflinePage";

// Pages... (vos imports restent identiques)
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Company from "./pages/Company";
import ImportExcel from "./pages/ImportExcel";
import ImportHistory from "./pages/ImportHistory";
import Support from "./pages/Support";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminImports from "./pages/admin/AdminImports";
import AdminSupport from "./pages/admin/AdminSupport";
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
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // --- 1. SÉCURITÉ ANTI-ZOOM (NIVEAU LOGICIEL) ---
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Bloque le pincement à deux doigts
      }
    };

    const preventKeyDownZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault(); // Bloque Ctrl + / Ctrl -
      }
    };

    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Bloque Ctrl + Molette
      }
    };

    // Application des blocages sur le document
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('keydown', preventKeyDownZoom);
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    // --- 2. GESTION DU MODE HORS-LIGNE ---
    const handleOnline = () => {
      setIsOnline(true);
      document.body.classList.remove('offline-mode');
      toast.success("Connexion rétablie", { description: "Vous êtes de nouveau en ligne." });
    };

    const handleOffline = () => {
      setIsOnline(false);
      document.body.classList.add('offline-mode');
      toast.error("Mode hors-ligne", { 
        description: "Certaines données pourraient ne pas être à jour.",
        duration: 5000 
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialisation
    const hasSeenWelcome = localStorage.getItem("mucodec_seen_welcome");
    setShowWelcome(!hasSeenWelcome);

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('keydown', preventKeyDownZoom);
      document.removeEventListener('wheel', preventWheelZoom);
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

  if (showWelcome === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {/* Overlay Offline : Le design reste chargé en dessous grâce au Service Worker (PWA) */}
          {!isOnline && <OfflinePage onRetry={handleRetryConnection} />}
          
          <Toaster />
          <Sonner position="top-center" expand={false} richColors />
          
          <BrowserRouter>
            <Routes>
              {/* PAGE DE GARDE */}
              <Route 
                path="/welcome" 
                element={showWelcome ? <WelcomeCover onFinished={handleWelcomeFinished} /> : <Navigate to="/" replace />} 
              />

              {/* AUTHENTIFICATION */}
              <Route path="/auth" element={showWelcome ? <Navigate to="/welcome" replace /> : <Auth />} />
              
              {/* ROUTES UTILISATEURS */}
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute><AppLayout><Company /></AppLayout></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><AppLayout><ImportExcel /></AppLayout></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AppLayout><ImportHistory /></AppLayout></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><AppLayout><Support /></AppLayout></ProtectedRoute>} />

              {/* ADMINISTRATION */}
              <Route path="/admin/*" element={
                <AdminAuthProvider>
                  <Routes>
                    <Route path="login" element={<AdminLogin />} />
                    <Route element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
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
