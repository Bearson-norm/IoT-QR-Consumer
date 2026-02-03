#!/bin/bash

# Script untuk detect perubahan yang memerlukan restart PM2
# Return code 0 = restart needed, 1 = reload only

# Files yang memerlukan restart (bukan reload)
RESTART_FILES=(
    "server.js"
    "database.js"
    "scheduler.js"
    "package.json"
    "ecosystem.config.js"
    "routes/"
    "utils/"
)

# Get list of changed files
# Priority: 1) Git diff, 2) Recent file modifications, 3) Always restart (safe)
CHANGED_FILES=()

# Check if we're in a git repository and can get diff
if git rev-parse --git-dir > /dev/null 2>&1; then
    # Try to get changed files from last commit
    if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -q .; then
        CHANGED_FILES=($(git diff --name-only HEAD~1 HEAD 2>/dev/null))
    elif git diff --name-only HEAD 2>/dev/null | grep -q .; then
        # Fallback: check unstaged changes
        CHANGED_FILES=($(git diff --name-only HEAD 2>/dev/null))
    fi
fi

# If no git changes, check for recently modified files (last 2 minutes)
# This catches files that were rsync'd recently
if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
    CHANGED_FILES=($(find . -type f \( -name "*.js" -o -name "package.json" -o -name "ecosystem.config.js" \) -mmin -2 2>/dev/null | grep -v node_modules | head -50))
fi

# If still no changed files detected, default to restart (safe option)
# This ensures we restart after deployment even if detection fails
if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
    echo "No changed files detected via git or file timestamps. Defaulting to restart (safe option)."
    exit 0
fi

# Check if any changed file requires restart
for file in "${CHANGED_FILES[@]}"; do
    for restart_file in "${RESTART_FILES[@]}"; do
        if [[ "$file" == *"$restart_file"* ]] || [[ "$file" == "$restart_file" ]]; then
            echo "Change detected in $file - RESTART required"
            exit 0
        fi
    done
done

# Only static files or minor changes - reload is sufficient
echo "Only minor changes detected - RELOAD sufficient"
exit 1
