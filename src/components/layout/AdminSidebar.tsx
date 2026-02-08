
import { Building2, Users, FileSpreadsheet, MessageSquare, LayoutDashboard, LogOut } from 'lucide-react';
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

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Entreprises', url: '/admin/companies', icon: Building2 },
  { title: 'Utilisateurs', url: '/admin/users', icon: Users },
  { title: 'Imports Flux', url: '/admin/imports', icon: FileSpreadsheet },
  { title: 'Support Client', url: '/admin/support', icon: MessageSquare },
];

export function AdminSidebar() {
  const { adminLogout } = useAdminAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-lg">Admin Panel</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                          isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={adminLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>Déconnexion</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
