#!/usr/bin/env bash
# Empaquette l'app et l'installe sur la TV Samsung.
# Usage : scripts/install.sh <IP de la TV> [profil de certificat]
#   ex. : scripts/install.sh 192.168.1.42 freemytv
set -euo pipefail

TV_IP="${1:-}"
PROFILE="${2:-freemytv}"
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
TIZEN="$TIZEN_HOME/tools/ide/bin/tizen"
SDB="$TIZEN_HOME/tools/sdb"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build"

if [ -z "$TV_IP" ]; then
    echo "Usage : $0 <IP de la TV> [profil de certificat]" >&2
    exit 1
fi
if [ ! -x "$TIZEN" ] || [ ! -x "$SDB" ]; then
    echo "Tizen Studio introuvable dans $TIZEN_HOME (définis TIZEN_HOME si installé ailleurs)." >&2
    exit 1
fi

echo "1/3  Connexion à la TV ($TV_IP)…"
"$SDB" connect "$TV_IP"

echo "2/3  Empaquetage et signature (profil « $PROFILE »)…"
rm -rf "$BUILD"
mkdir -p "$BUILD"
cp -R "$ROOT/app/." "$BUILD/"
"$TIZEN" package -t wgt -s "$PROFILE" -- "$BUILD"
# Le nom généré ("Free My TV.wgt") contient des espaces, que l'installeur de la TV ne gère pas
WGT="FreeMyTV.wgt"
mv "$(ls "$BUILD"/*.wgt | head -n 1)" "$BUILD/$WGT"

echo "3/3  Installation de $WGT…"
"$TIZEN" install -n "$WGT" -s "$TV_IP:26101" -- "$BUILD"

echo "Terminé : ouvre « Free My TV » dans les applications de la TV."
