# Comparaison GS-2.0.0 et GS-3.0.0

Fixtures synthétiques de profils nutritionnels réalistes. Les points attendus GS-3 ont été contrôlés manuellement avec les tableaux 5 à 10 de l’annexe 1-B. Aucun résultat ne désigne un produit commercial. Les écarts reflètent à la fois la nouvelle version des tables et la nouvelle échelle éditoriale.

| Profil | Contrôle manuel des points 2023 | GS-2 | GS-3 | Écart |
| --- | --- | ---: | ---: | ---: |
| Eau nature | Cas spécifique, sans points bruts | 90 | 100 | +10 |
| Soda sucré | N = 3 énergie + 9 sucres, P = 0 | 30 | 31 | +1 |
| Céréales complètes | N = 4 énergie + 2 sucres + 1 sel, P = 5 fibres + 4 protéines, brut −2 | 90 | 91 | +1 |
| Yaourt nature | N = 1 sucres + 1 saturés, P = 1 protéines, brut 1 | 84 | 83 | −1 |
| Huile d’olive | N = 4 énergie des saturés + 1 ratio, P = 5 part éligible, brut 0 | 30 | 75 | +45 |
| Céréales bio | Même composition et points que la fixture céréales | 100 | 91 | −9 |
| Soda avec aspartame | N = 12 + 4 édulcorant, P = 0 | 15 | 15 | 0 |
| Céréales sans part végétale renseignée | Entrée requise absente | 90 | Non évaluable | — |
| Yaourt avec points 2023 divergents | Source 2, calcul 1 | 84 | Non évaluable | — |

L’huile passe dans la grille spécifique aux matières grasses. Les céréales bio perdent le bonus de label. Le soda édulcoré obtient la même note par deux chemins différents. GS-2 déduisait des points d’additifs et GS-3 applique le barème des boissons. Les deux dernières lignes illustrent des cas où GS-3 garde les faits et s’abstient.

Les entrées versionnées se trouvent dans `packages/domain/src/scoring/gs3-fixtures.ts`. Les résultats et la séparation des axes sont vérifiés dans `gree-score-v3.test.ts`. L’ancien moteur est figé dans `gree-score-v2.ts` pour rejouer cette comparaison.

[Annexe 1-B, spécification Nutri-Score 2023](https://www.santepubliquefrance.fr/content/download/150258/file/Nutriscore_reglement_usage_EN_20240626.pdf).
