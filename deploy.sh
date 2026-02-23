#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# deploy.sh — Déploiement du Todo App avec Helm
# Usage :
#   ./deploy.sh            # install ou upgrade
#   ./deploy.sh uninstall  # supprime la release
# =============================================================================

RELEASE_NAME="todo"
NAMESPACE="todo"
CHART_DIR="$(dirname "$0")/helm"
VALUES_FILE="$CHART_DIR/values.yaml"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

if [[ "${1:-}" == "uninstall" ]]; then
  info "Suppression de la release '$RELEASE_NAME' dans le namespace '$NAMESPACE'..."
  helm uninstall "$RELEASE_NAME" --namespace "$NAMESPACE" || warn "Release introuvable."
  kubectl delete namespace "$NAMESPACE" --ignore-not-found
  info "Suppression terminée."
  exit 0
fi

command -v helm      &>/dev/null || error "helm n'est pas installé."
command -v kubectl   &>/dev/null || error "kubectl n'est pas installé."

JWT_SECRET=$(grep -A2 'jwt:' "$VALUES_FILE" | grep 'secret:' | awk -F'"' '{print $2}')
if [[ -z "$JWT_SECRET" ]]; then
  error "backend.jwt.secret est vide dans $VALUES_FILE. Remplissez-le avant de déployer."
fi

if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
  info "Création du namespace '$NAMESPACE'..."
  kubectl create namespace "$NAMESPACE"
fi

info "Vérification du chart..."
helm lint "$CHART_DIR" --values "$VALUES_FILE"

if helm status "$RELEASE_NAME" --namespace "$NAMESPACE" &>/dev/null; then
  info "Release existante détectée — upgrade en cours..."
  helm upgrade "$RELEASE_NAME" "$CHART_DIR" \
    --namespace "$NAMESPACE" \
    --values "$VALUES_FILE" \
    --wait \
    --timeout 5m
else
  info "Première installation — install en cours..."
  helm install "$RELEASE_NAME" "$CHART_DIR" \
    --namespace "$NAMESPACE" \
    --values "$VALUES_FILE" \
    --wait \
    --timeout 5m
fi

echo ""
info "Déploiement terminé !"
echo ""
helm status "$RELEASE_NAME" --namespace "$NAMESPACE"
echo ""
info "Pods :"
kubectl get pods --namespace "$NAMESPACE"
