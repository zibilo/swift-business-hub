# Déploiement Mobile MUCODEC

Ce document explique comment configurer la signature des APK Android pour le déploiement automatisé via GitHub Actions.

## 1. Génération de la Clé de Signature (Keystore)

Pour garantir la compatibilité avec l'environnement de build (GitHub Actions), la clé doit être au format **JKS**.

Nous avons fourni un script pour vous aider :
```bash
./scripts/generate-keystore.sh
```

Suivez les instructions à l'écran. Le script va générer un fichier `release-key.jks`.

## 2. Configuration des Secrets GitHub

Une fois la clé générée, vous devez l'ajouter aux secrets de votre dépôt GitHub (**Settings** -> **Secrets and variables** -> **Actions**).

| Nom du Secret | Description |
| :--- | :--- |
| `ANDROID_SIGNING_KEY` | Le contenu du fichier `.jks` converti en **Base64**. |
| `ANDROID_KEY_ALIAS` | L'alias défini lors de la génération (ex: `mucodec-alias`). |
| `ANDROID_KEYSTORE_PASSWORD` | Le mot de passe du fichier Keystore. |
| `ANDROID_KEY_PASSWORD` | Le mot de passe de la clé (souvent identique au précédent). |

### Comment obtenir la chaîne Base64 ?
- **Linux/Mac :** `base64 -i release-key.jks`
- **Windows (PowerShell) :** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("release-key.jks"))`

## 3. Résolution des problèmes (CI/CD)

### Erreur `java.io.IOException: Tag number over 30 is not supported`
Cette erreur survient si le Keystore a été généré avec un format PKCS12 récent non supporté par les outils de build plus anciens.
**Solution :** Utilisez le script `generate-keystore.sh` qui force le format `-storetype JKS`.

### Erreur `Failed to load signer "signer #1"`
Cela signifie souvent que l'un des secrets (Alias ou Password) est manquant ou incorrect dans GitHub.
**Solution :** Vérifiez que `ANDROID_KEY_ALIAS` correspond exactement à l'alias utilisé dans le Keystore.

## 4. Architecture Native

Le projet utilise **Capacitor**. Pour synchroniser les changements web vers le projet natif :
```bash
npm run build
npx cap sync android
```

L'APK générée par la CI se trouve dans les **Artifacts** du run de l'Action GitHub.
