import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ShieldCheck, Menu } from "lucide-react";

export const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { isAdminAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <ShieldCheck className="h-10 w-10 text-[#00204E] opacity-20" />
        </motion.div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F1F5F9]">
        
        {/* SIDEBAR : Automatiquement gérée par SidebarProvider (Desktop + Mobile) */}
        <AdminSidebar />

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1 w-full relative flex flex-col min-h-screen overflow-x-hidden">
          
          {/* HEADER MOBILE UNIQUEMENT (Visible sur mobile/tablette) */}
          <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#00204E] text-white shadow-lg sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2" />
              <span className="font-black text-sm tracking-tight uppercase">Admin Console</span>
            </div>
            <ShieldCheck className="h-5 w-5 text-red-500" />
          </header>

          {/* ZONE DE CONTENU AVEC ANIMATIONS DE TRANSITION */}
          <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                {children || <Outlet />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* FOOTER DE CONFORMITÉ (Optionnel) */}
          <footer className="px-10 py-6 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            MUCODEC Systems • Accès Sécurisé Niveau 3
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
};
