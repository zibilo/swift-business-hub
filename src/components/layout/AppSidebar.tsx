import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Building2, FileSpreadsheet, MessageSquare, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const appMenuItems = [
  { title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Mon Entreprise', url: '/company', icon: Building2 },
  { title: 'Importation', url: '/import', icon: FileSpreadsheet },
  { title: 'Support', url: '/support', icon: MessageSquare },
];

export function AppSidebar() {
  const { logout } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200">
      <SidebarHeader className="border-b p-4 bg-[#00204E] text-white">
        <span className="font-black text-sm">MUCODEC</span>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarMenu>
          {appMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <NavLink
                  to={item.url}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-[#00204E] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
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
      </SidebarContent>
    </Sidebar>
  );
}
