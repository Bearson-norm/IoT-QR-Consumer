#!/bin/bash

# Script untuk verifikasi setup SSH untuk GitHub Actions

echo "=========================================="
echo "Verifikasi SSH Setup untuk GitHub Actions"
echo "=========================================="
echo ""

# 1. Cek apakah .ssh directory ada
if [ ! -d "$HOME/.ssh" ]; then
    echo "✗ Directory ~/.ssh tidak ditemukan"
    echo "  Buat dengan: mkdir -p ~/.ssh && chmod 700 ~/.ssh"
    exit 1
else
    echo "✓ Directory ~/.ssh ada"
fi

# 2. Cek authorized_keys
if [ ! -f "$HOME/.ssh/authorized_keys" ]; then
    echo "✗ File ~/.ssh/authorized_keys tidak ditemukan"
    echo "  Buat dengan: touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    exit 1
else
    echo "✓ File ~/.ssh/authorized_keys ada"
    KEY_COUNT=$(wc -l < "$HOME/.ssh/authorized_keys")
    echo "  Jumlah public keys: $KEY_COUNT"
fi

# 3. Cek permissions
echo ""
echo "Cek permissions:"
AUTH_KEYS_PERM=$(stat -c "%a" "$HOME/.ssh/authorized_keys" 2>/dev/null || stat -f "%OLp" "$HOME/.ssh/authorized_keys" 2>/dev/null)
if [ "$AUTH_KEYS_PERM" != "600" ] && [ "$AUTH_KEYS_PERM" != "0600" ]; then
    echo "✗ Permissions ~/.ssh/authorized_keys salah: $AUTH_KEYS_PERM (harus 600)"
    echo "  Fix dengan: chmod 600 ~/.ssh/authorized_keys"
else
    echo "✓ Permissions ~/.ssh/authorized_keys benar: $AUTH_KEYS_PERM"
fi

SSH_DIR_PERM=$(stat -c "%a" "$HOME/.ssh" 2>/dev/null || stat -f "%OLp" "$HOME/.ssh" 2>/dev/null)
if [ "$SSH_DIR_PERM" != "700" ] && [ "$SSH_DIR_PERM" != "0700" ]; then
    echo "✗ Permissions ~/.ssh salah: $SSH_DIR_PERM (harus 700)"
    echo "  Fix dengan: chmod 700 ~/.ssh"
else
    echo "✓ Permissions ~/.ssh benar: $SSH_DIR_PERM"
fi

# 4. Cek SSH keys yang ada
echo ""
echo "SSH keys yang ditemukan:"
find "$HOME/.ssh" -type f -name "*" ! -name "*.pub" ! -name "known_hosts" ! -name "authorized_keys" ! -name "config" 2>/dev/null | while read -r keyfile; do
    if [ -f "$keyfile" ] && head -1 "$keyfile" 2>/dev/null | grep -q "BEGIN.*PRIVATE KEY"; then
        echo "  - $keyfile"
        if [ -f "${keyfile}.pub" ]; then
            PUB_KEY=$(cat "${keyfile}.pub")
            FINGERPRINT=$(ssh-keygen -l -f "$keyfile" 2>/dev/null | awk '{print $2}')
            echo "    Public: ${keyfile}.pub"
            echo "    Fingerprint: $FINGERPRINT"
            
            # Cek apakah public key sudah di authorized_keys
            if grep -q "$PUB_KEY" "$HOME/.ssh/authorized_keys" 2>/dev/null; then
                echo "    ✓ Public key sudah di authorized_keys"
            else
                echo "    ✗ Public key BELUM di authorized_keys"
                echo "      Tambahkan dengan: cat ${keyfile}.pub >> ~/.ssh/authorized_keys"
            fi
        fi
        echo ""
    fi
done

# 5. Test SSH connection (jika ada key)
echo ""
echo "=========================================="
echo "Instruksi untuk GitHub Secrets:"
echo "=========================================="
echo ""
echo "1. Tampilkan private key untuk GitHub Secrets:"
echo "   cat ~/.ssh/github_actions_deploy"
echo ""
echo "2. Copy SELURUH isi private key (termasuk header dan footer)"
echo "   Header biasanya: -----BEGIN OPENSSH PRIVATE KEY-----"
echo "   Footer biasanya: -----END OPENSSH PRIVATE KEY-----"
echo ""
echo "3. Pastikan public key sudah di authorized_keys:"
echo "   cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "4. Test SSH connection dari local:"
echo "   ssh -i ~/.ssh/github_actions_deploy $USER@$(hostname -I | awk '{print $1}')"
echo ""
