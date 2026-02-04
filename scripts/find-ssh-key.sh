#!/bin/bash

# Script untuk mencari SSH key yang sudah ada atau membuat yang baru

echo "=========================================="
echo "Mencari SSH Key untuk GitHub Actions"
echo "=========================================="
echo ""

# Cari file SSH key yang mungkin ada
echo "Mencari SSH key yang sudah ada..."
echo ""

# Cek beberapa lokasi umum
POSSIBLE_LOCATIONS=(
    "$HOME/.ssh/github_actions_deploy"
    "$HOME/.ssh/id_ed25519"
    "$HOME/.ssh/id_rsa"
    "$HOME/.ssh/id_ed25519_github"
    "$HOME/.ssh/github_deploy"
    "/root/.ssh/github_actions_deploy"
    "/root/.ssh/id_ed25519"
)

FOUND_KEY=""

for location in "${POSSIBLE_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        echo "✓ Ditemukan: $location"
        FOUND_KEY="$location"
        
        # Tampilkan info key
        echo "  Type: $(ssh-keygen -l -f "$location" 2>/dev/null | awk '{print $4}')"
        echo "  Size: $(ssh-keygen -l -f "$location" 2>/dev/null | awk '{print $1}')"
        echo ""
        
        # Tampilkan public key
        if [ -f "${location}.pub" ]; then
            echo "  Public key:"
            cat "${location}.pub"
            echo ""
        fi
        
        break
    fi
done

# Cari semua file private key di .ssh
echo "Mencari semua private key di ~/.ssh..."
echo ""
find "$HOME/.ssh" -type f -name "*" ! -name "*.pub" ! -name "known_hosts" ! -name "authorized_keys" ! -name "config" 2>/dev/null | while read -r keyfile; do
    if [ -f "$keyfile" ] && [ -r "$keyfile" ]; then
        # Cek apakah ini private key (biasanya dimulai dengan -----BEGIN)
        if head -1 "$keyfile" | grep -q "BEGIN.*PRIVATE KEY"; then
            echo "  - $keyfile"
            if [ -f "${keyfile}.pub" ]; then
                echo "    Public: ${keyfile}.pub"
                echo "    Fingerprint: $(ssh-keygen -l -f "$keyfile" 2>/dev/null | awk '{print $2}')"
            fi
            echo ""
        fi
    fi
done

echo ""
echo "=========================================="
if [ -n "$FOUND_KEY" ]; then
    echo "✓ SSH Key ditemukan: $FOUND_KEY"
    echo ""
    echo "Untuk menampilkan private key (copy untuk GitHub Secrets):"
    echo "  cat $FOUND_KEY"
    echo ""
    echo "Untuk menampilkan public key:"
    echo "  cat ${FOUND_KEY}.pub"
else
    echo "✗ SSH Key tidak ditemukan di lokasi umum"
    echo ""
    echo "Apakah Anda ingin membuat SSH key baru?"
    echo "  ssh-keygen -t ed25519 -C 'github-actions-deploy' -f ~/.ssh/github_actions_deploy"
    echo ""
    echo "Atau jika Anda sudah punya key di lokasi lain, cari dengan:"
    echo "  find ~ -name '*github*' -o -name '*deploy*' 2>/dev/null | grep -i key"
fi
echo "=========================================="
