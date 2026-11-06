# GreeCheck 3.0 · préparation au lancement

Ce dossier décrit le candidat de lancement et les contrôles nécessaires avant promotion. La production publique a été vérifiée le 6 novembre 2026 et sert le commit 95c312fa92e20db6c03a42d71fa7a9b821569982, antérieur à la v3. Le projet Vercel gree-check pointe sur GitHub et le déploiement de production observé correspond à main.

## Audit du candidat

| Surface | État vérifié dans le candidat | Limite |
| --- | --- | --- |
| Architecture | Next.js App Router, interfaces client localisées, domaine TypeScript pur, proxies stateless, Dexie et Zustand. Démarrage de la migration locale et décodeur séparés du JavaScript initial. | Le navigateur peut bloquer ou évincer le stockage. |
| Sources et API | Contrôle GS1, validation des enveloppes, délais, déduplication, budgets par instance, erreurs publiques stables. L’URL des clés n’entre pas dans les messages d’erreur. | Les budgets locaux ne constituent pas un quota distribué. OFF et Overpass restent des dépendances opérationnelles. |
| GS-3 et environnement | GS-3.0.0 produit un score déterministe ou un motif Non évaluable. GreeImpact reste indépendant et s’affiche sur données disponibles. | La complétude, l’identité et les déclarations du catalogue ont des limites distinctes. |
| Parcours courses | Scanner, saisie, recherche FR/EN/AR, évaluation, alternatives sur données suffisantes, favoris et historique. | Les suggestions dépendent du catalogue et de sa disponibilité. |
| Stockage | Purge atomique des tables IndexedDB, y compris listes et registre de remplacement, purge des copies de navigation et d’images. Les recherches avec paramètres ne sont pas ajoutées à CacheStorage. | Les journaux de la plateforme suivent sa propre politique. |
| PWA | Manifestes localisés, icônes PNG et maskable, icône Apple, standalone, safe areas, pages essentielles et mise à jour versionnée. | L’installation native, la caméra et l’écran de lancement restent à vérifier sur iPhone et Android physiques. L’écran de lancement est géré par le système. |
| Accessibilité | Contrôles Playwright/axe, clavier, mouvement réduit, cibles principales, contraste et RTL. | Une passe VoiceOver/TalkBack et l’acceptation WCAG 2.2 AA complète demandent une revue manuelle. |
| Confidentialité et sécurité | Aucune publicité, aucun compte ni SDK de suivi. CSP, HSTS, restrictions de permissions, protection des cadres, images Next sans redirection, audit npm. | La CSP autorise le bootstrap inline de Next pour conserver le rendu statique. |
| Pages publiques | Méthodologie, Sources, Confidentialité, À propos, Contribuer et Soutenir dans les trois langues. | Les dons et la recherche par ville sont désactivés sans configuration valide. |

## Variables et exécution

| Variable | Effet |
| --- | --- |
| NEXT_PUBLIC_SITE_URL | Origine canonique. Défaut vérifié https://gree-check.vercel.app. |
| OFF_BASE_URL, OFF_SEARCH_BASE_URL | Surcouches serveur, utiles aux fixtures. NEXT_PUBLIC_OFF_BASE_URL reste un alias historique. |
| OFF_PRODUCT_API_VERSION | v3 par défaut. v2 constitue un retour temporaire. |
| OFF_USER_AGENT | Identifie le projet auprès d’OFF. OPENFOODFACTS_USER_AGENT reste l’alias historique du projet Vercel. |
| USDA_FDC_API_KEY | Clé facultative côté serveur. Absente des configurations Vercel observées le 6 novembre 2026. |
| NOMINATIM_API_URL | Endpoint de géocodage provisionné compatible Nominatim. Sans valeur valide, seule la recherche par position approximative est proposée dans Découvrir. L’instance Nominatim publique est exclue du code. |
| OVERPASS_API_URL, OSM_USER_AGENT | Miroir Overpass préféré et identification. Les miroirs publics restent utilisables pour la recherche à la demande. |
| GREECHECK_DONATION_URL | Destination HTTPS de don effectivement configurée. Sans valeur valide, le site affiche le statut indisponible. |
| NEXT_PUBLIC_OCR_BETA | Laisser à 0 pour le lancement. Le bêta dépend d’un hébergement compatible de ses ressources WASM avant activation publique. |
| VERCEL_ENV, NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA | Variables système. noindex en preview, version des caches par commit. Activer l’exposition des variables système sur Vercel. |

Exécuter npm ci --include=optional, npm run lint, npm run typecheck:domain, npm run typecheck, npm test, npm run build, npm run test:e2e et npm audit --audit-level=high. La CI exécute ces portes sur les branches de livraison. Le workflow visuel manuel publie un artefact qui peut être revu sans écrire dans Git.

## Checklist de lancement

- [ ] Vérifier le SHA de la preview, le statut READY, la protection SSO, la CI distante et l’en-tête noindex.
- [ ] Vérifier les pages publiques FR/EN/AR, le domaine canonique, le sitemap, les alternates et la séparation avec l’URL preview.
- [ ] Vérifier la disponibilité d’OFF et la dégradation propre sur les alternatives en cas de 429 ou 503. Effectuer un seul smoke réel par candidat et respecter Retry-After.
- [ ] Exécuter la [checklist appareils](SHOPPING_DEVICE_CHECKLIST.md) sur un iPhone Safari et un Android Chrome. Inclure installation, écran de lancement, caméra, reprise et mise à jour en standalone.
- [ ] Tester VoiceOver/TalkBack, navigation clavier et zoom à 200 % sur le candidat. Relancer la purge et contrôler l’état après réouverture.
- [ ] Collecter des mesures de terrain ou CrUX si le volume le permet. Les cibles p75 sont LCP ≤ 2,5 s, INP ≤ 200 ms et CLS ≤ 0,1. [Définition des Core Web Vitals](https://web.dev/articles/vitals)
- [ ] Vérifier les éventuelles destinations de don et la politique des fournisseurs optionnels avant leur activation.
- [ ] Obtenir l’autorisation explicite de promotion. Promouvoir le SHA testé, relever l’ancien déploiement READY pour le rollback, puis refaire le smoke et les vérifications SEO sur le domaine public.

## Priorités

- **P0** · contrôler le LCP du scanner et l’INP de l’accueil sur appareils physiques, vérification de la preview et surveillance de la disponibilité intermittente des catégories et décision sur la mise en avant de Découvrir avant promotion.
- **P1** · réduire les latences mesurées à froid, collecter des données de terrain sans suivi publicitaire, compléter la revue WCAG avec lecteurs d’écran et documenter la capacité des fournisseurs.
- **P2** · étendre la matrice d’appareils, évaluer un fournisseur de géocodage dédié si la demande le justifie et élargir les références documentées.
