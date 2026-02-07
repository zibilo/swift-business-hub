import { Building2, FileSpreadsheet, MessageSquare, User, History, Home } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';

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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-lg">Espace Entreprise</span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Disable certain menu items if user has no company
                const requiresCompany = ['/import', '/history', '/support', '/company'];
                const isDisabled = !companyUser && requiresCompany.includes(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild disabled={isDisabled}>
                      <NavLink
                        to={isDisabled ? '#' : item.url}
                        end={item.url === '/'}
                        className={`flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
