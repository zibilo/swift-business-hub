import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminImports from "./pages/admin/AdminImports";
import AdminSupport from "./pages/admin/AdminSupport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
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

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
