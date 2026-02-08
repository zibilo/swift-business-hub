
import React from 'react';
import {
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonPage
} from '@ionic/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../BrandLogo';
import { BrandIcon, BrandIconName } from '../BrandIcons';

const menuItems: { title: string, path: string, icon: BrandIconName }[] = [
  { title: 'Tableau de bord', path: '/', icon: 'dashboard' },
  { title: 'Entreprise', path: '/company', icon: 'business' },
  { title: 'Import Excel', path: '/import', icon: 'import' },
  { title: 'Historique', path: '/history', icon: 'history' },
  { title: 'Support', path: '/support', icon: 'support' },
  { title: 'Profil', path: '/profile', icon: 'profile' },
];

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonSplitPane contentId="main-content" when="lg">
        {/* DESKTOP MENU */}
        <IonMenu contentId="main-content" type="reveal">
          <IonHeader>
            <IonToolbar color="primary">
              <div className="flex items-center gap-2 px-4 py-2">
                <BrandLogo className="h-8 w-auto" color="white" />
              </div>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {menuItems.map((item) => (
                <IonItem
                  key={item.path}
                  button
                  onClick={() => navigate(item.path)}
                  detail={false}
                  lines="none"
                  className={location.pathname === item.path ? 'bg-primary/10' : ''}
                >
                  <BrandIcon name={item.icon} className="mr-3" />
                  <IonLabel>{item.title}</IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonContent>
        </IonMenu>

        <div id="main-content" className="ion-page">
          <IonHeader className="lg:hidden">
            <IonToolbar>
              <IonButtons slot="start">
                <IonMenuButton />
              </IonButtons>
              <div className="flex justify-center flex-1">
                <BrandLogo className="h-6 w-auto" />
              </div>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {children}
          </IonContent>

          {/* MOBILE TABS */}
          <IonTabs>
            <IonRouterOutlet></IonRouterOutlet>
            <IonTabBar slot="bottom" className="lg:hidden border-t">
              <IonTabButton tab="dashboard" onClick={() => navigate('/')} selected={location.pathname === '/'}>
                <BrandIcon name="dashboard" size={24} />
                <IonLabel className="text-[10px]">Dashboard</IonLabel>
              </IonTabButton>
              <IonTabButton tab="company" onClick={() => navigate('/company')} selected={location.pathname === '/company'}>
                <BrandIcon name="business" size={24} />
                <IonLabel className="text-[10px]">Entreprise</IonLabel>
              </IonTabButton>
              <IonTabButton tab="import" onClick={() => navigate('/import')} selected={location.pathname === '/import'}>
                <BrandIcon name="import" size={24} />
                <IonLabel className="text-[10px]">Import</IonLabel>
              </IonTabButton>
              <IonTabButton tab="support" onClick={() => navigate('/support')} selected={location.pathname === '/support'}>
                <BrandIcon name="support" size={24} />
                <IonLabel className="text-[10px]">Support</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};
