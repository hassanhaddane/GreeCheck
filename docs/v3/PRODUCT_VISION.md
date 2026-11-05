# GreeCheck 3.0 · Vision produit

**Scanne. Comprends. Choisis mieux.**

GreeCheck aide le grand public à décider devant un rayon. L'utilisateur scanne un produit ou le recherche, comprend son évaluation, puis peut examiner une meilleure alternative lorsqu'une différence est documentée. L'application est gratuite, indépendante et disponible en français, en anglais et en arabe. Le parcours de base fonctionne sans inscription ni configuration de préférences.

## La décision en trois étapes

1. **Identifier.** Scanner en priorité, avec saisie du code-barres et recherche texte en cas de refus de la caméra, de code illisible ou de produit introuvable.
2. **Comprendre.** Afficher le verdict, ses raisons et les limites des données. GreeScore évalue le produit, GreeImpact décrit l'impact environnemental et les critères locaux signalent la compatibilité. Ces lectures gardent leurs propres sources et niveaux de confiance.
3. **Choisir.** Proposer une alternative comparable avec un avantage vérifiable. Le comparateur aide à arbitrer lorsque plusieurs produits sont en jeu. Un état explicite explique quand les données ne permettent aucune recommandation.

Les critères de l'utilisateur, ses collections et ses scans restent sur son appareil. Une recherche transmet au proxy les éléments nécessaires à la requête. La géolocalisation est déclenchée par l'utilisateur et les lieux restent un outil secondaire. Le classement repose sur les données, les règles publiées et les critères locaux. Un éventuel soutien financier ne modifie ni les notes ni le classement.

## Priorités et critères de réussite

| Priorité | Périmètre | Critère de réussite |
| --- | --- | --- |
| P0 | Navigation et continuité | Exactement trois destinations principales aux tailles 390 px et 1440 px. Les anciens liens ouvrent la bonne vue pour les trois langues. Les collections existantes restent lisibles après rechargement. |
| P0 | Parcours de décision | Un produit fixture peut être saisi, trouvé, consulté et comparé à une alternative. Les fixtures introuvable, incomplète et non comparable donnent chacune un état distinct. |
| P0 | Fiabilité du score | Cible V3 de zéro note numérique affichée pour les fixtures non évaluables sur le scan, la recherche, les fiches, les collections, les comparaisons et les agrégats. Les écarts actuels figurent dans l'audit. |
| P1 | Déploiement et accessibilité | FR, EN et AR sans débordement horizontal entre 320 et 1440 px sur les parcours clés. Zéro violation axe A/AA sur les routes vérifiées, puis contrôle clavier, lecteur d'écran et caméra sur appareils réels. |
| P1 | Confiance et performance | Identifier le fournisseur et la version sur les résultats évalués. Mesurer LCP et INP sur les pages clés, avec cibles p75 de 2,5 s et 200 ms. Documenter le comportement lors d'une panne amont et hors ligne. |
| P2 | Outils facultatifs | Évaluer l'utilité de Discover, du Coach et de l'OCR avec des scénarios volontaires. Revoir les variantes de recherche par marché et les sources secondaires selon les lacunes mesurées. |

Les mesures de réussite s'appuient d'abord sur des fixtures, des sessions de test et des mesures de performance sans identifiant utilisateur. L'évolution de la présentation, du scoring et des autres parcours fait l'objet de livraisons séparées.
