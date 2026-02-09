import { Building2, FileSpreadsheet, MessageSquare, User, History, Home, ChevronRight, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const menuItems = [
  { title: 'Accueil', url: '/', icon: Home, badge: null },
  { title: 'Mon Profil', url: '/profile', icon: User, badge: null },
  { title: 'Mon Entreprise', url: '/company', icon: Building2, badge: null },
  { title: 'Import Excel', url: '/import', icon: FileSpreadsheet, badge: 'Nouveau', badgeVariant: 'default' as const },
  { title: 'Historique', url: '/history', icon: History, badge: null },
  { title: 'Support', url: '/support', icon: MessageSquare, badge: null },
];

export function AppSidebar() {
  const location = useLocation();
  const { companyUser, user } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r bg-gradient-to-b from-background to-muted/20">
      {/* Header avec gradient moderne */}
      <SidebarHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Espace Entreprise
              </span>
              <span className="text-xs text-muted-foreground">
                Gestion de paie
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground/70 mb-2">
            {!isCollapsed ? 'MENU PRINCIPAL' : '•••'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                // Disable certain menu items if user has no company
                const requiresCompany = ['/import', '/history', '/support', '/company'];
                const isDisabled = !companyUser && requiresCompany.includes(item.url);
                const isActive = location.pathname === item.url || 
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      disabled={isDisabled}
                      className="group relative"
                    >
                      <NavLink
                        to={isDisabled ? '#' : item.url}
                        end={item.url === '/'}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                          ${isDisabled 
                            ? 'opacity-40 cursor-not-allowed' 
                            : 'hover:bg-primary/5 hover:shadow-sm'
                          }
                          ${isActive 
                            ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-medium shadow-sm border-l-2 border-primary' 
                            : 'text-muted-foreground hover:text-foreground'
                          }
                        `}
                        activeClassName="bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-medium"
                      >
                        {/* Icône avec effet de brillance au hover */}
                        <div className={`
                          flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-all duration-200
                          ${isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'group-hover:bg-primary/5'
                          }
                        `}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="truncate">{item.title}</span>
                            
                            {/* Badge si présent */}
                            {item.badge && !isDisabled && (
                              <Badge 
                                variant={item.badgeVariant || "secondary"} 
                                className="ml-auto shrink-0 text-[10px] px-1.5 py-0 h-5"
                              >
                                {item.badge}
                              </Badge>
                            )}
                            
                            {/* Icône de verrouillage pour les items désactivés */}
                            {isDisabled && (
                              <span className="ml-auto text-xs text-muted-foreground/50">
                                🔒
                              </span>
                            )}
                            
                            {/* Flèche au hover pour les items actifs */}
                            {!isDisabled && isActive && (
                              <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            )}
                          </div>
                        )}
                        
                        {/* Effet de brillance au survol */}
                        {!isDisabled && (
                          <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Message d'information si pas d'entreprise */}
        {!companyUser && !isCollapsed && (
          <>
            <Separator className="my-4" />
            <div className="px-4 py-3 mx-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    Créez votre entreprise
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80">
                    Pour accéder à toutes les fonctionnalités
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </SidebarContent>

      {/* Footer avec info utilisateur */}
      {!isCollapsed && (
        <SidebarFooter className="border-t p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {user?.email?.split('@')[0] || 'Utilisateur'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {companyUser?.role === 'admin' ? '👑 Administrateur' : '👤 Utilisateur'}
              </span>
            </div>
          </div>
        </SidebarFooter>
      )}

      {/* Footer collapsed */}
      {isCollapsed && (
        <SidebarFooter className="border-t p-2">
          <div className="flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
