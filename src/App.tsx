import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Company from "./pages/Company";
import ImportExcel from "./pages/ImportExcel";
import ImportHistory from "./pages/ImportHistory";
import Support from "./pages/Support";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminImports from "./pages/admin/AdminImports";
import AdminSupport from "./pages/admin/AdminSupport";

const queryClient = new QueryClient();

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, loading } = useAdminAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {children}
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public/Auth Routes */}
              <Route path="/auth" element={<Auth />} />

              {/* User Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/company"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Company />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ImportExcel />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ImportHistory />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Support />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/companies" element={<AdminProtectedRoute><AdminCompanies /></AdminProtectedRoute>} />
              <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
              <Route path="/admin/imports" element={<AdminProtectedRoute><AdminImports /></AdminProtectedRoute>} />
              <Route path="/admin/support" element={<AdminProtectedRoute><AdminSupport /></AdminProtectedRoute>} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
