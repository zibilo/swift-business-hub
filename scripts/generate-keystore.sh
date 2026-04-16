#!/bin/bash

# Configuration
KEYSTORE_NAME="release-key.jks"
KEY_ALIAS="mucodec-alias"
VALIDITY_DAYS=10000

echo "--- MUCODEC Keystore Generator ---"
echo "This script generates a keystore compatible with Android apksigner (JKS format)."
echo ""

# Check if keytool is installed
if ! command -v keytool &> /dev/null
then
    echo "Error: 'keytool' is not installed. Please install Java Development Kit (JDK)."
    return 1 2>/dev/null || exit 1
fi

# Generate the key
keytool -genkey -v -keystore $KEYSTORE_NAME -keyalg RSA -keysize 2048 -validity $VALIDITY_DAYS -alias $KEY_ALIAS -storetype JKS

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore generated successfully: $KEYSTORE_NAME"
    echo "Alias: $KEY_ALIAS"
    echo ""
    echo "--- NEXT STEPS ---"
    echo "1. Convert this file to Base64 to add it to GitHub Secrets:"
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "   Command (Windows): certutil -encode $KEYSTORE_NAME temp.txt && type temp.txt"
    else
        echo "   Command (Linux/Mac): base64 -i $KEYSTORE_NAME"
    fi
    echo ""
    echo "2. Add the following Secrets to your GitHub Repository (Settings -> Secrets -> Actions):"
    echo "   - ANDROID_SIGNING_KEY: (The Base64 string from step 1)"
    echo "   - ANDROID_KEY_ALIAS: $KEY_ALIAS"
    echo "   - ANDROID_KEYSTORE_PASSWORD: (The password you just entered)"
    echo "   - ANDROID_KEY_PASSWORD: (Usually the same as keystore password)"
    echo ""
    echo "⚠️  IMPORTANT: Keep this $KEYSTORE_NAME file and your passwords in a safe place (LastPass, 1Password, etc.)."
    echo "Do NOT commit this file to Git."
else
    echo "❌ Failed to generate keystore."
    return 1 2>/dev/null || exit 1
fi
