# GreeCheck 3.0 · sources de données

La [méthode détaillée des sources](../methodology/data-sources-v3.md) décrit le contrat de provenance, les licences et les critères de conflit. La page publique Sources expose les attributions FR/EN/AR.

| Source | Statut dans le candidat | Usage |
| --- | --- | --- |
| Open Food Facts produit | Activée, smoke réel réussi | API v3 et GTIN vérifié. Lecture v2 uniquement pour un retour temporaire. |
| Open Food Facts texte | Activée, smoke réel réussi | Search-a-licious et fallback encadré. Les données et noms localisés dépendent du catalogue. |
| Open Food Facts catégories | Activée, smoke réussi au second passage espacé | API structurée v2. Le premier contrôle a renvoyé une indisponibilité. En cas d’indisponibilité, l’écran des alternatives affiche une erreur et permet un nouvel essai. |
| USDA FoodData Central | Configurable, clé absente du projet observé | Correspondance stricte Branded sur le GTIN exact. Le smoke nécessite une clé et un GTIN de référence fourni par l’opérateur. |
| Anses Ciqual 2025 | Activée, extrait de trois catégories | Composition générique identifiée comme référence, indépendante de la mesure du produit. |
| Anses et EFSA | Activées comme références éditoriales | Référentiel AE-1.0.0. Aucune déduction automatique d’un risque individuel. |
| Green-Score et Agribalyse | Disponibles selon la fiche OFF | GreeImpact garde le grade source et distingue l’estimation de catégorie. |
| OpenStreetMap via Overpass | Activée sur demande dans Découvrir, contrôle réel non concluant | Recherche autour de coordonnées arrondies. Résultats contributifs et dépendants du réseau. |
| Géocodage ville | Désactivé sur le candidat sans configuration | Accepte un endpoint provisionné. L’instance Nominatim publique a une limite globale et une politique d’usage incompatible avec un défaut public non contrôlé. [Politique Nominatim](https://operations.osmfoundation.org/policies/nominatim/) |

## Attributions

- Open Food Facts, base ODbL, contenus individuels selon les conditions et photos de produit CC BY-SA. [Conditions OFF](https://world.openfoodfacts.org/terms-of-use) · [Documentation API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- U.S. Department of Agriculture, Agricultural Research Service, FoodData Central, CC0. [Guide officiel USDA](https://fdc.nal.usda.gov/api-guide/)
- Anses. 2025. Table de composition nutritionnelle des aliments Ciqual, Licence Ouverte. [Jeu de données](https://doi.org/10.57745/RDMHWY)
- © OpenStreetMap et ses contributeurs, ODbL. [Attribution et licence](https://www.openstreetmap.org/copyright)

La suite de tests utilise des fixtures. Pour un contrôle ponctuel réel, lancer GREECHECK_LIVE_SMOKE=1 npm run smoke:providers depuis un environnement sans surcouche de fixtures. Une lecture, une recherche texte et une recherche de catégorie sont demandées. GREECHECK_SMOKE_OVERPASS=1 ajoute une requête distincte sur une position publique fixe. Aucun cron ni retry immédiat. Espacer les contrôles et respecter Retry-After. La clé USDA reste côté serveur et les erreurs de ce script omettent les URL et réponses brutes.
