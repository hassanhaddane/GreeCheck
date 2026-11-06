# Sécurité du candidat GreeCheck 3.0

## Contrôles applicatifs

Next désactive x-powered-by et applique CSP, HSTS, nosniff, X-Frame-Options, COOP, CORP, Referrer-Policy et Permissions-Policy. Les scripts externes et les connexions tierces sont exclus par la CSP. Les scripts inline de bootstrap restent autorisés pour le rendu statique. La règle script-src exclut unsafe-eval en production. La politique autorise la caméra et la géolocalisation sur la même origine et interdit le microphone. Les previews reçoivent noindex. Les images distantes optimisées sont limitées aux domaines OFF configurés, avec zéro redirection.

Les routes produit, recherche et alternatives contrôlent leurs entrées et renvoient des codes d’erreur opaques. Le code produit doit respecter le format et le chiffre de contrôle GS1. Les réponses fournisseur sont contrôlées avant normalisation. Le client OFF fixe un délai de cinq secondes par source et l’adaptateur USDA utilise des appels de 3,5 secondes par étape. Les 429 et 503 sont distinctes et Retry-After suspend les appels concernés. La clé USDA reste côté serveur et n’apparaît pas dans les URL de provenance. Les budgets sont par instance et couvrent les usages ordinaires, avec une protection Vercel à décider en fonction de la charge réelle.

Découvrir refuse les paramètres ambigus. Les coordonnées sont arrondies côté client et serveur, les réponses sont privées et no-store, les entrées non valides sont rejetées et l’API a un limiteur dédié. Le géocodage ville nécessite un fournisseur provisionné. Le worker exclut les routes API et les recherches à paramètres du cache des navigations.

## Dépendances et exploitation

La CI installe avec npm ci, exécute npm audit --audit-level=high et bloque les vulnérabilités hautes ou critiques rapportées par le registre. Le candidat migre Next et eslint-config-next à 16.4.5 et conserve des versions corrigées de PostCSS et des dépendances transitives. L’override minimatch 11.0.1 est limité à typescript-estree. Vérifier sa nécessité à chaque mise à niveau de l’outillage.

Le projet ne contient pas de SDK de suivi ou de session replay. La [politique des flux](privacy-data-flows.md) décrit la conservation. Avant promotion, contrôler à nouveau les avis du registre, les variables serveur, la protection Preview et les en-têtes du déploiement exact. [Avis Next.js de référence](https://github.com/advisories/GHSA-6gpp-xcg3-4w24)
