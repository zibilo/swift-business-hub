import { motion, AnimatePresence } from 'framer-motion';
import { Building2, FileSpreadsheet, MessageSquare, User, History, Home, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom'; // Ajusté pour l'exemple
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Accueil', url: '/', icon: Home },
  { title: 'Mon Profil', url: '/profile', icon: User },
  { title: 'Mon Entreprise', url: '/company', icon: Building2 },
  { title: 'Import Excel', url: '/import', icon: FileSpreadsheet },
  { title: 'Historique', url: '/history', icon: History },
  { title: 'Support', url: '/support', icon: MessageSquare },
];

export function AppSidebar() {
  const location = useLocation();
  const { companyUser } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <SidebarHeader className="p-6">
        <motion.div 
          layout
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="font-bold tracking-tight text-slate-900 dark:text-slate-100">Espace Pro</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dashboard</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Menu Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => {
                const requiresCompany = ['/import', '/history', '/support', '/company'];
                const isDisabled = !companyUser && requiresCompany.includes(item.url);
                const isActive = location.pathname === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink
                      to={isDisabled ? '#' : item.url}
                      className={cn(
                        "relative group flex items-center h-11 w-full rounded-lg px-3 transition-all duration-300",
                        isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50",
                        isActive ? "text-primary" : "text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {/* Background de l'item actif avec Framer Motion */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}

                      <div className="relative z-10 flex items-center gap-3 w-full">
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                          isActive ? "text-primary" : "text-slate-500"
                        )} />
                        
                        {!isCollapsed && (
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm font-medium"
                          >
                            {item.title}
                          </motion.span>
                        )}

                        {/* Petit indicateur de flèche au survol */}
                        {!isCollapsed && !isDisabled && !isActive && (
                          <ChevronRight className="ml-auto h-3 w-3 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer décoratif ou info utilisateur */}
      {!isCollapsed && (
        <div className="mt-auto p-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10">
            <p className="text-[10px] font-medium text-primary uppercase mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-600 dark:text-slate-300">Système opérationnel</span>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
