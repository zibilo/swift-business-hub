
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { isAdminAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F1F5F9]">
        <div className="hidden md:block h-screen sticky top-0">
          <AdminSidebar />
        </div>

        <main className="flex-1 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="p-6"
            >
              {children || <Outlet />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </SidebarProvider>
  );
};
