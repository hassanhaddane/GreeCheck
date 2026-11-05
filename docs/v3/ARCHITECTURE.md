# GreeCheck 3.0 · Architecture

**Décision 01/06 · Adopter les frontières existantes et réduire le nombre de portes d'entrée.**

Le projet conserve Next.js 16 App Router, React 19, TypeScript strict, Tailwind, next-intl, Zustand, Dexie, Playwright et le paquet pur `@greecheck/domain`. Une réorganisation des routes et des appels suffit pour livrer ce jalon. Une migration de framework ou un passage immédiat à un client natif ajouterait une seconde surface de validation et des risques de migration des collections.

## Direction des dépendances

| Couche | Responsabilité | Point d'entrée actuel |
| --- | --- | --- |
| Présentation | Rendu localisé, navigation, états de chargement, actions explicites. | src/app/[locale], src/components, messages. |
| Application web | Orchestration de lookup, cache et déduplication, stores de fonctionnalités et pont caméra. | src/domains, src/hooks. |
| Données distantes | API publiques, garde-fous, choix fournisseur, normalisation, enveloppes stables. | src/app/api, src/services/api. |
| Données locales | Persistance versionnée, migration des anciennes clés et lecture IndexedDB. | src/services/storage, consommé par les stores et le repository produit. |
| Domaine | Produit normalisé, score, compatibilité, environnement, comparaison et agrégations déterministes. | packages/domain. Aucune dépendance UI, navigateur ou réseau. |

Le navigateur calcule l'évaluation à partir du produit normalisé et des critères locaux. Les proxies reçoivent les codes, requêtes, catégories ou coordonnées nécessaires aux appels publics. Le serveur de la fiche peut construire le titre et le JSON-LD depuis le même fournisseur, sans accéder à l'état local.

## Contrats préparés

- **Fournisseurs.** `lookupBarcode` dessert à la fois la route produit et le rendu serveur. Seul Open Food Facts est actif. La chaîne passe au fournisseur suivant sur une absence confirmée. Une panne ou une limitation reste une erreur. Le contrat produit/recherche est séparé de l'implémentation OFF et la forme JSON est stable. La recherche et les catégories restent des capacités OFF à ce stade. Activer un second fournisseur après validation des identifiants et de la couverture, des licences, du quota et de la qualité de ses données.
- **Provenance.** Le modèle porte déjà `Product.source`, la qualité, les données environnementales et leurs signaux amont. Le cache a une date locale de récupération. P1 : ajouter une provenance par groupe de faits si plusieurs fournisseurs alimentent un produit, avec identifiant amont, date disponible et origine de chaque enrichissement. Garder séparées la date de collecte, la date de mise en cache et la version du calcul. Les données Ciqual génériques peuvent éclairer une catégorie sans devenir des faits d'un produit de marque.
- **Score versionné.** `computeGreeScore` expose un résultat discriminé, sa version et les éléments de preuve. GS-3.0.0 attribue 100 % du poids à la nutrition et sépare NOVA, additifs, certifications, préférences et GreeImpact. Dexie conserve les notes historiques avec leur version et recalcule les entrées compatibles au démarrage. GS-2 reste disponible pour les tests de comparaison. [Méthodologie GS-3](../methodology/gree-score-v3.md).
- **Résultat non évaluable.** Le moteur fournit déjà `status` et une cause typée. Cible P0 : remplacer le contrat avec sentinelle par une union évalué/non évalué dans laquelle seule la branche évaluée porte une note. Faire migrer le scan, le classement, les vues locales, la comparaison et les agrégats avant de retirer les champs legacy. Les états introuvable, limitation, erreur réseau et copie périmée restent distincts de la décision métier.
- **Offline-first.** Le domaine pur peut être réutilisé par un client mobile avec son propre adaptateur de lecture et de persistance. La PWA actuelle dispose d'un cache produit IndexedDB et d'un fallback de navigation. P1 : formaliser la lecture locale avant le réseau, l'âge de la copie et la distinction entre un produit jamais vu et un produit déjà consulté. Mesurer la disponibilité hors ligne après installation, redémarrage et éviction du cache.

## Arbitrages de maintenance

Le comparateur garde le stockage `battle` et le moteur santé existants. Le regroupement de navigation ne nécessite aucun changement de schéma. Les contrats existants et les tests de pureté ont plus de valeur à ce stade qu'un port générique pour chaque moteur. Le changement supprime le wrapper de carte sans logique propre et le suivi Git du cache compilateur. Les composants qui partagent une présentation mais portent des actions différentes restent distincts jusqu'à une convergence observable.

La documentation de référence du calcul reste dans [docs/methodology](../methodology). Voir [l'audit](FEATURE_AUDIT.md) et [le plan de migration](MIGRATION_PLAN.md) pour les écarts et critères avant activation.
