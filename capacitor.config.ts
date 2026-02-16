import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mucodec.espaceentreprise',
  appName: 'MUCODEC Espace Entreprise',
  webDir: 'dist',
  server: {
    // Utilisation de HTTPS pour la compatibilité avec les API modernes
    androidScheme: 'https'
  },
  
  /* --- CONFIGURATION POUR L'ASPECT NATIF ET HORS-LIGNE --- */
  
  android: {
    // Empêche l'effet de "halo bleu" ou de rebond quand on arrive en haut/bas de page
    // Cela renforce l'impression que le design est fixe et ne peut pas être "bougé"
    overScrollMode: "never", 
    
    // Couleur de fond par défaut affichée pendant que le design charge
    backgroundColor: "#F8FAFC",
    
    // Permet de charger des ressources locales plus rapidement
    allowMixedContent: true,
    
    // Optimisation de la saisie (évite que le clavier ne pousse tout le design)
    windowSoftInputMode: "adjustResize"
  },

  plugins: {
    // On force l'application à rester en mode clair ou sombre selon votre choix
    // pour éviter des bugs de design offline
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;
