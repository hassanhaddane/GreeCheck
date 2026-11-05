# GreeCheck 3.0 · Plan de migration

## P0 · Réorganisation et intégrité locale

- Livrer les routes, libellés FR/EN/AR, redirections et raccourcis PWA ensemble. Garder l'identifiant PWA et les pages de découverte et d'aide.
- Regrouper les vues historique et favoris sans fusionner leurs tables. Réutiliser le brouillon Battle via le store Compare. Conserver le nom de base, la version Dexie, les noms des tables et les anciennes clés reconnues par la migration localStorage.
- Charger la liste sauvegardée avant le premier ajout depuis le comparateur, le panier ou la liste elle-même. Une écriture ne doit jamais partir d'une liste vide si des entrées existent déjà.
- Avant de publier un nouveau contrat de score, inventorier les consommateurs et représenter explicitement les anciennes lignes sans statut fiable. Conserver le contenu local. Rafraîchir la note à partir d'un produit source quand il est disponible, plutôt que de déduire le statut d'une note 50/C.
- Avant une publication, vérifier les alertes npm de la référence et stabiliser le test SEO sur une source déterministe. Confirmer le périmètre réel de l'effacement local.

## P1 · Confiance et résilience

- Publier un contrat de provenance et une version de résultat avec stratégie de lecture des entrées existantes. Tester une réévaluation et les deux modes de comparaison avec des données partielles.
- Définir la politique de cache hors ligne par parcours. Vérifier le premier démarrage après installation, la réouverture d'un produit déjà vu, l'erreur pour un produit absent du cache et le retour en ligne.
- Tester les anciens raccourcis PWA et la mise à jour du service worker sur une installation existante, puis caméra, navigation clavier, lecteur d'écran et RTL sur appareils.
- Séparer les cas déterministes des sondes live Open Food Facts. Mesurer la latence du scan, du chargement fiche et de la recherche sur un profil mobile documenté.

## P2 · Extensions facultatives

Évaluer la couverture réelle avant tout branchement Ciqual ou USDA. Tester Discover avec sa politique CSP et ses flux de géolocalisation. Évaluer la beta OCR en environnement de production et les scénarios GreeCoach sans augmenter le nombre d'entrées principales.

## Risques, contrôle et retour arrière

| Risque | Contrôle vérifiable | Retour arrière |
| --- | --- | --- |
| Perte de signets, de locale ou de raccourcis | Exercices des routes historiques et des nouvelles routes sur FR/EN/AR. Manifestes et accès directs contrôlés dans Playwright. | Redéployer l'ancienne navigation ou conserver temporairement des alias. Les 308 peuvent être gardées par les navigateurs. Si retour de l'ancienne interface, conserver les nouvelles URLs comme alias le temps de résorber les caches. |
| Perte de données au premier accès | Tests de migration Battle/localStorage, historique et favoris dans le même profil, ajout concurrent à une liste existante. Aucun nouveau schéma Dexie dans ce jalon. | Réutiliser les mêmes stores et tables sans conversion inverse. |
| Fausse note ou alternative | Contrôler les fixtures incomplète, non comparable et alternative non supérieure avant toute migration de contrat. | Réactiver le contrat de lecture précédent et préserver la version des résultats déjà écrits. |
| Coexistence d'un ancien shell PWA et des nouvelles routes | Tester navigation en ligne, rechargement, mise à jour et réouverture hors ligne. | Laisser le worker et le cache existants servir leur fallback, puis rafraîchir les routes quand le réseau revient. |
| Variation du fournisseur ou du navigateur | Distinguer tests mockés, tests live et références visuelles Linux. Comparer l'état de référence et la branche à environnement comparable. | Dégrader vers l'état explicite ou le cache local. Un échec amont ne doit pas se transformer en absence confirmée. |

## Passage du jalon 01/06

Le build, le typage, le lint et les tests unitaires doivent passer. Playwright vérifie la navigation de trois liens, le menu secondaire, les alias, le mode avancé et la persistance après rechargement. Les changements visuels dus à la navigation et au retrait de cartes sont contrôlés sur les références de la plateforme CI. Les écarts externes ou préexistants restent tracés dans [l'audit](FEATURE_AUDIT.md). Le lot se termine par un commit isolé, sans changement de méthodologie, déploiement ni migration de données.
