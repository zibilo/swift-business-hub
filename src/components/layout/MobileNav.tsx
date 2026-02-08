import { Building2, FileSpreadsheet, User, History, Home, Lock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Entreprise', url: '/company', icon: Building2 },
  { title: 'Imports', url: '/import', icon: FileSpreadsheet },
  { title: 'Audit', url: '/history', icon: History },
  { title: 'Profil', url: '/profile', icon: User },
];

export function MobileNav() {
  const location = useLocation();
  const { companyUser } = useAuth();

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 md:hidden flex justify-center px-6 pointer-events-none">
      <motion.nav 
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto relative flex items-center justify-around gap-1 w-full max-w-sm rounded-full border border-white/20 bg-[#00204E]/90 backdrop-blur-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      >
        {navItems.map((item) => {
          const requiresCompany = ['/import', '/history', '/company'];
          const isDisabled = !companyUser && requiresCompany.includes(item.url);
          const isActive = location.pathname === item.url;

          return (
            <Link
              key={item.title}
              to={isDisabled ? '#' : item.url}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-4 rounded-full transition-all duration-300",
                isDisabled ? "opacity-20 cursor-not-allowed" : "active:scale-90"
              )}
            >
              {/* Bulle d'activation morphique */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="active-glow"
                    className="absolute inset-0 bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10 flex flex-col items-center gap-1">
                {isDisabled ? (
                  <Lock className="h-5 w-5 text-slate-400" />
                ) : (
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive ? "text-[#00204E] scale-110" : "text-white/60"
                    )} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                )}
                
                {/* Point indicateur discret au lieu du texte */}
                {isActive && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-1 w-1 rounded-full bg-[#00204E]"
                  />
                )}
              </div>

              {/* Tooltip flottant au-dessus si actif */}
              {isActive && (
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -45 }}
                  className="absolute text-[10px] font-black uppercase tracking-widest text-white bg-[#00204E] px-3 py-1 rounded-full border border-white/10 shadow-xl"
                >
                  {item.title}
                </motion.span>
              )}
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
              }
