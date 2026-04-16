import { 
  Building2, Users, FileSpreadsheet, MessageSquare, 
  LayoutDashboard, LogOut, Calculator, ShieldAlert, 
  TrendingUp, FileText, Landmark, ShieldCheck
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
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
  useSidebar,
} from '@/components/ui/sidebar';

// Définition des menus par groupe
const adminMenuItems = [
  // GROUPE : SUPERVISION
  { title: 'Tableau de bord', url: '/admin', icon: LayoutDashboard, group: 'SUPERVISION' },
  { title: 'Entreprises', url: '/admin/companies', icon: Building2, group: 'SUPERVISION' },
  { title: 'Utilisateurs', url: '/admin/users', icon: Users, group: 'SUPERVISION' },
  { title: 'Historique Flux', url: '/admin/imports', icon: FileSpreadsheet, group: 'SUPERVISION' },
  
  // GROUPE : FINANCE
  { title: 'Calcul des Frais', url: '/admin/finance-fees', icon: Calculator, group: 'FINANCE' },
  { title: 'Moteur Financier', url: '/admin/finance-engine', icon: Landmark, group: 'FINANCE' },
  
  // GROUPE : RISQUES
  { title: 'Audit & Conformité', url: '/admin/compliance', icon: ShieldAlert, group: 'SÉCURITÉ' },
  
  // GROUPE : STRATÉGIE
  { title: 'Plan Prévisionnel', url: '/admin/budget', icon: TrendingUp, group: 'STRATÉGIE' },
  { title: 'Rapport Direction', url: '/admin/report', icon: FileText, group: 'STRATÉGIE' },
  
  // GROUPE : SERVICE
  { title: 'Support Client', url: '/admin/support', icon: MessageSquare, group: 'SERVICE' },
];

export function AdminSidebar() {
  const { adminLogout } = useAdminAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Liste unique des groupes pour le rendu
  const groups = ['SUPERVISION', 'FINANCE', 'SÉCURITÉ', 'STRATÉGIE', 'SERVICE'];

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200">
      {/* HEADER : Logo et Titre */}
      <SidebarHeader className="border-b p-4 bg-[#00204E] text-white">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-1.5 rounded-lg shrink-0 shadow-lg">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-sm tracking-tighter whitespace-nowrap">MUCODEC ADMIN</span>
              <span className="text-[9px] text-blue-300 uppercase font-bold tracking-widest truncate">Direction Générale</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        {groups.map((groupName) => (
          <SidebarGroup key={groupName}>
            {!isCollapsed && (
              <SidebarGroupLabel className="px-3 text-[10px] font-black text-slate-400 mt-4 mb-2 tracking-[0.2em]">
                {groupName}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems
                  .filter((item) => item.group === groupName)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                              isActive 
                                ? 'bg-blue-50 text-[#00204E] font-bold shadow-sm ring-1 ring-blue-100/50' 
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span className="text-xs">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* BOUTON DÉCONNEXION */}
        <SidebarGroup>
          <SidebarGroupContent className="mt-4 pt-4 border-t border-slate-100">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={adminLogout} 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl mx-2"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="text-xs font-bold">Fermer la session</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
      }
