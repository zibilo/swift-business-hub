import { NativeBiometric, BiometryType } from '@capacitor-community/native-biometric';

export const checkBiometry = async () => {
  try {
    // 1. Vérifie si le téléphone possède un capteur d'empreinte
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) return false;

    // 2. Affiche la demande d'empreinte
    await NativeBiometric.verifyIdentity({
      reason: "Authentification sécurisée MUCODEC",
      title: "Accès par Empreinte",
      subtitle: "Veuillez poser votre doigt sur le capteur",
      description: "Confirmez votre identité pour accéder à vos données de paie.",
      negativeButtonText: "Annuler",
    });
    
    return true;
  } catch (error) {
    console.error("Échec de la biométrie", error);
    return false;
  }
};
