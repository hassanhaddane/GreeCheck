# GreeCheck 3.0 · Routes et navigation

Les URLs de l'application utilisent les préfixes /fr, /en et /ar. Les exemples ci-dessous omettent le préfixe. La liste des destinations principales est partagée entre le dock mobile et la navigation desktop.

| Surface | URL | Accès |
| --- | --- | --- |
| Scanner | /scan | Action centrale sur mobile, premier lien sur desktop et CTA de l'accueil. La caméra se lance sur la page dédiée. |
| Rechercher | /search | Navigation principale et raccourci de recherche desktop. Le paramètre q reste pris en charge. |
| Mes produits | /products | Navigation principale. Vue Mes scans par défaut, avec statistiques hebdomadaires repliées. |
| Favoris | /products/favorites | Deuxième vue de Mes produits avec lien direct, navigation clavier et état courant. |
| Accueil | / | Logo et entrée publique localisée. Accès au scan, à la recherche et aux produits récents. |
| Fiche | /product/[barcode] | Résultat d'un scan ou d'une recherche, lien des collections, comparaison ou alternative. |
| GreeCompare | /compare | Menu Plus et actions contextuelles. Verdict et choix d'abord, tableau, barres, podium et Coach dans Comparaison avancée. La consultation des données de référence reste proposée quand les produits sont incomparables. |
| GreeCart et liste | /cart, /list | Menu Plus et actions contextuelles. Panier d'analyse et liste d'achats distincts. |
| Discover | /discover | Menu Plus ou URL directe. |
| Critères, réglages et informations | /criteria, /settings, /methodology, /privacy, /support | Menu Plus. Choix de la langue également disponible dans ce menu. |
| OCR Beta | /scan | Section repliée, visible si le drapeau de build l'autorise. |
| Hors ligne | /offline | Fallback localisé du service worker. |

## Compatibilité des liens

| Ancien lien | Destination | Contrat |
| --- | --- | --- |
| /history | /products | 308, ouverture sur les scans. |
| /favorites | /products/favorites | 308, ouverture sur les favoris. |
| /battle | /compare | 308, même brouillon de deux à trois produits. |
| /basket | /cart | 308 hérité. |
| /map | / | 308 hérité. Discover est accessible dans Plus. |
| /scan?source=battle | /scan?source=battle | Paramètre historique accepté. Après résolution, retour direct vers /compare. |

Les redirections s'appliquent aux trois locales via la configuration Next.js. Les requêtes héritées conservent leurs paramètres. Le proxy next-intl traite les chemins sans préfixe. Les vues privées de Mes produits restent hors index. Le manifeste conserve le même identifiant et démarre sur Scanner. Ses raccourcis suivent les trois destinations principales. Un ancien raccourci Battle peut encore ouvrir le comparateur via sa redirection.
