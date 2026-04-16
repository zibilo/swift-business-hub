import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mucodec.espaceentreprise',
  appName: 'MUCODEC Espace Entreprise',
  webDir: 'dist',
  
  server: {
    // HTTPS obligatoire pour la sécurité bancaire et l'accès biométrique
    androidScheme: 'https'
  },

  /* --- CONFIGURATION ANDROID (Look & Feel Natif) --- */
  android: {
    // Empêche le rebond bleu/gris quand on arrive en haut ou bas de page
    // Cela rend le design "fixe" et pro
    overScrollMode: "never", 
    
    // Couleur de fond par défaut (évite le flash blanc au chargement)
    backgroundColor: "#F8FAFC",
    
    // Gère le comportement du clavier (ajuste le design sans tout écraser)
    windowSoftInputMode: "adjustResize",

    // Permet de charger des assets locaux de manière sécurisée
    allowMixedContent: true
  },

  /* --- CONFIGURATION DES PLUGINS NATIFS --- */
  plugins: {
    // 1. Écran de démarrage (Splash Screen)
    SplashScreen: {
      launchShowDuration: 2000, // Affiche le logo MUCODEC pendant 2 sec
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#F8FAFC",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false, // Plus propre sans le spinner par défaut
    },

    // 2. Gestion du stockage sécurisé des cookies/sessions
    CapacitorCookies: {
      enabled: true
    },

    // 3. Plugin Biométrique
    // (Le plugin NativeBiometric fonctionne sans config ici, 
    // mais on s'assure de sa compatibilité)
    NativeBiometric: {}
  }
};

export default config;
