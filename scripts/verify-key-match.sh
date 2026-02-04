#!/bin/bash

# Script untuk verifikasi bahwa private key dan public key match

echo "=========================================="
echo "Verifikasi Private Key dan Public Key Match"
echo "=========================================="
echo ""

KEY_FILE="$HOME/.ssh/github_actions_deploy"

if [ ! -f "$KEY_FILE" ]; then
    echo "✗ Private key tidak ditemukan: $KEY_FILE"
    exit 1
fi

if [ ! -f "${KEY_FILE}.pub" ]; then
    echo "✗ Public key tidak ditemukan: ${KEY_FILE}.pub"
    exit 1
fi

echo "✓ Private key ditemukan: $KEY_FILE"
echo "✓ Public key ditemukan: ${KEY_FILE}.pub"
echo ""

# Extract public key dari private key
PRIVATE_KEY_PUB=$(ssh-keygen -y -f "$KEY_FILE" 2>/dev/null)
STORED_PUB=$(cat "${KEY_FILE}.pub")

echo "Public key dari private key:"
echo "$PRIVATE_KEY_PUB"
echo ""

echo "Public key yang tersimpan:"
echo "$STORED_PUB"
echo ""

# Compare (remove comment part)
PRIVATE_KEY_PUB_NO_COMMENT=$(echo "$PRIVATE_KEY_PUB" | awk '{print $1 " " $2}')
STORED_PUB_NO_COMMENT=$(echo "$STORED_PUB" | awk '{print $1 " " $2}')

if [ "$PRIVATE_KEY_PUB_NO_COMMENT" = "$STORED_PUB_NO_COMMENT" ]; then
    echo "✓ Private key dan public key MATCH!"
    echo ""
    echo "=========================================="
    echo "Private Key untuk GitHub Secrets:"
    echo "=========================================="
    echo ""
    echo "Copy SELURUH isi di bawah ini ke GitHub Secrets (VPS_SSH_KEY):"
    echo ""
    cat "$KEY_FILE"
    echo ""
    echo "=========================================="
else
    echo "✗ Private key dan public key TIDAK MATCH!"
    echo ""
    echo "Ini berarti private key dan public key bukan pasangan yang sama."
    echo "Solusi:"
    echo "1. Generate ulang key pair:"
    echo "   ssh-keygen -t ed25519 -C 'github-actions-deploy' -f ~/.ssh/github_actions_deploy"
    echo ""
    echo "2. Atau gunakan key yang sudah ada dan pastikan public key di authorized_keys sesuai"
    exit 1
fi
