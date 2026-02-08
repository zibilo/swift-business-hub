import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8FAFC]">
        {/* SIDEBAR : Uniquement visible sur Desktop (md:block) */}
        <div className="hidden md:block h-screen sticky top-0">
          <AppSidebar />
        </div>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="pb-24 md:pb-8" // Padding pour ne pas cacher le contenu par la nav mobile
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* MOBILE NAV : Uniquement visible sur Mobile (md:hidden) */}
        <MobileNav />
      </div>
    </SidebarProvider>
  );
};
