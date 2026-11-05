# GreeScore GS-3.0.0

Version publiée le 5 novembre 2026. Le moteur travaille sur une fiche normalisée. À fiche, préférences et version identiques, il renvoie le même résultat. La note est un indice nutritionnel éditorial pour comparer des produits comparables. Elle ne représente ni une mesure officielle de santé, ni une probabilité de sécurité, ni une recommandation médicale.

## Calcul

1. Identifier le profil nutritionnel à partir de la catégorie ou du profil 2023 déclaré par la source. Vérifier la cohérence des catégories et de la base nutritionnelle renseignée. Les observations concurrentes, les valeurs impossibles et les catégories exclues entraînent un résultat non évaluable.
2. Utiliser les **points bruts explicitement versionnés 2023** de la source, lorsqu’ils sont compatibles avec son classement, ou les recalculer à partir des tables de l’annexe 1-B. Si les deux chemins sont disponibles, leurs points doivent coïncider. Une lettre seule n’est jamais convertie. Une valeur absente n’est jamais imputée. Les points identifiés comme estimés ou calculés pour un produit préparé ne sont pas admissibles.
3. Additionner les points négatifs d’énergie, sucres, graisses saturées et sel, puis soustraire les points positifs de fibres, de fruits/légumes/légumineuses et de protéines lorsque les règles de profil les comptent. Les matières grasses utilisent l’énergie des graisses saturées et leur ratio dans les matières grasses. Pour une boisson, le statut des édulcorants non nutritifs est requis. Leur présence ajoute quatre points négatifs suivant l’annexe officielle. La règle des fromages, le plafond des protéines de viande rouge et les seuils spécifiques aux boissons et matières grasses sont appliqués quand le profil est identifié.
4. Convertir les points bruts p avec la formule éditoriale `round(clamp(100 × (b − p) / (b − a), 0, plafond))`. Pour l’eau nature identifiée, le résultat est directement 100. La lettre **GreeScore** utilise les seuils 80, 65, 45 et 25 pour A, B, C, D et E. Le classement **Nutri-Score** est un champ distinct.

| Profil | Borne favorable a | Borne défavorable b | Plafond |
| --- | ---: | ---: | ---: |
| Aliments généraux | −5 | 30 | 100 |
| Matières grasses, huiles, noix et graines | −10 | 30 | 100 |
| Boissons hors eau nature | −6 | 20 | 99 |

Les bornes sont des choix de GreeCheck. Les produits au-delà d’une borne peuvent partager le même résultat. L’ordre est monotone dans un profil. Les différences de points GreeScore entre profils n’expriment pas une différence de santé. [Nutri-Score, règlement d’usage et annexe 1-B, tableaux 5 à 10](https://www.santepubliquefrance.fr/content/download/150258/file/Nutriscore_reglement_usage_EN_20240626.pdf).

## Pondération et axes distincts

| Information | Poids GS-3 | Traitement |
| --- | ---: | --- |
| Profil nutritionnel | 100 % | Points 2023, ou eau nature établie |
| Additifs | 0 % | Présence déclarée et référence documentaire quand recensée. Les édulcorants des boissons suivent le calcul nutritionnel 2023. |
| Certifications | 0 % | Un label nommé est présenté comme signalé par la source. La certification requiert une preuve du certificateur. |
| NOVA | 0 % | Groupe fourni par la source. Il décrit le degré de transformation et dépend des informations disponibles sur les ingrédients et procédés. Il ne décrit pas à lui seul la composition nutritionnelle. |
| GreeImpact | Séparé | Présent seulement si l’axe environnemental est évaluable. |
| Préférences | Séparées | Alertes et compatibilité calculées sur l’appareil. L’allergène repéré est prioritaire, y compris sans note. Une certification halal absente laisse le statut indéterminé. |

GS-3 ne dispose pas de données d’exposition permettant d’estimer un risque lié à un additif. Le registre documentaire `AE-1.0.0` couvre E249 et E250 via l’Anses et E951 via l’EFSA. Une entrée contient l’autorité, l’URL, la date et le type de publication. La présence d’un additif ou l’existence d’un avis ne permettent pas de conclure à un danger ou à une absence de risque. [Anses, évaluation des nitrites et nitrates](https://www.anses.fr/system/files/ERCA2020SA0106EN.pdf) · [EFSA, réévaluation de l’aspartame](https://doi.org/10.2903/j.efsa.2013.3496) · [Anses, avis sur la classification NOVA](https://www.anses.fr/fr/system/files/NUT2022-SA-0155.pdf).

## Contrat et limites

- `scored` expose un entier de 0 à 100, la version et sa date, le composant nutritionnel, la provenance, les facteurs calculables, la confiance, les données manquantes et les alertes. Quand la reconstruction complète est impossible, le chemin fournisseur expose les points et leur provenance. Les teneurs déclarées éventuellement affichées n’attribuent pas de contribution brute inconnue.
- `unscored` expose un motif, les données manquantes, les faits disponibles, les actions possibles et les alertes. Les champs numériques de la note et de ses composants sont absents. Les codes sont localisables en français, anglais et arabe.
- **Confiance élevée** pour un calcul local reproductible dont l’identité a été contrôlée. **Moyenne** pour les autres produits évaluables, notamment les points du fournisseur et l’eau nature. **Faible** pour un résultat non évaluable. Ces niveaux décrivent la vérifiabilité du calcul et de l’identité, pas une précision médicale.
- La taxonomie locale couvre un sous-ensemble de catégories et exige les quantités sur la base attendue. Les fiches collaborative et hors ligne peuvent être anciennes. Les champs facultatifs peuvent manquer même si le fournisseur a publié des points, et les anciens formats peuvent omettre la mention d’estimation. Les produits sans profil défendable, les catégories spéciales non prises en charge, les valeurs contradictoires, ainsi que les aliments nécessitant des données à l’état préparé sont exclus selon les informations disponibles. Les références génériques Ciqual ne participent jamais au calcul d’un produit scanné. L’OCR actuel restitue les observations confirmées et laisse la note indisponible quand la catégorie et les entrées requises manquent.
- Un allergène reconnu dans les ingrédients ou signalé par la source, y compris dans les traces, déclenche une alerte. La couverture dépend des déclarations et des termes reconnus. L’absence d’alerte n’établit pas l’absence de l’allergène.

## Migration locale

Au démarrage, une transaction Dexie recalcule les entrées d’historique et les favoris à partir des fiches locales disponibles, et les paniers à partir de leurs produits embarqués. La version est enregistrée. Une ancienne note est archivée avec sa version connue ou `legacy`. Sans fiche exploitable, l’ancienne valeur reste hors affichage et hors agrégats. Les identifiants, dates et collections sont conservés. Les notes courantes sont ignorées lors des exécutions suivantes. Les anciennes lettres de liste et les anciens gains de remplacement restent en stockage local et sont écartés de l’affichage GS-3. La moyenne du panier annonce le nombre de produits évalués.

Voir [l’audit GS-2](gs-2-critical-audit.md) et [la comparaison par fixture](gs-2-vs-gs-3.md).
