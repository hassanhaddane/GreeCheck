# Confidentialité et conservation

GreeCheck fonctionne sans compte, profil serveur, publicité ni suivi publicitaire. Le projet ne possède pas de base de données utilisateur. Un cookie de préférence NEXT_LOCALE peut mémoriser la langue. Les réglages de thème et de langue de l’interface peuvent aussi utiliser localStorage. Ces valeurs ne servent pas à l’identification ou à la publicité.

## Sur l’appareil

IndexedDB contient l’historique, les favoris, GreeCart, le brouillon GreeCompare, les préférences, les listes, le registre des remplacements et le cache de produits. Les données personnelles locales restent jusqu’à l’effacement ou l’éviction par le navigateur. Le cache produit est considéré frais pendant 24 h. Hors connexion, une copie plus ancienne peut être affichée avec son statut et, lorsque disponible, sa date. CacheStorage contient le shell, les ressources et des copies de navigation et d’images. Le worker exclut les navigations avec paramètres et les routes API de ce cache. sessionStorage porte une protection de session contre les boucles de récupération du shell.

L’utilisateur peut supprimer les collections dans Réglages. La réinitialisation efface les tables IndexedDB en une transaction, les caches d’exécution et les réglages locaux. Le shell installé reste disponible. Lors du retour dans l’interface, le navigateur peut mémoriser à nouveau la langue courante.

## Requêtes

| Parcours | Informations transmises | Conservation dans le code de l’application |
| --- | --- | --- |
| Produit | GTIN vers le proxy, puis OFF. USDA si la clé est présente et que la résolution le justifie. | Cache serveur borné des données publiques, cinq minutes pour un produit et une minute pour une absence. |
| Recherche | Texte et locale vers OFF. | Cache serveur mémoire de dix minutes, sans identifiant utilisateur. |
| Alternatives | Catégorie et code à exclure vers le proxy. Le filtre de catégorie est transmis à OFF. | Cache serveur mémoire borné pour les résultats publics de catégorie. |
| Découvrir | Ville si un géocodeur provisionné est configuré, ou coordonnées arrondies à deux décimales après action explicite. | Pas de cache partagé pour les réponses de localisation. Les résultats de géocodage ville sont gardés en mémoire serveur une heure au plus. |
| Images et liens | Certaines vignettes sont demandées à OFF. Les liens d’attribution, de contribution, d’itinéraire ou de don ouvrent des services externes après action. | Les images peuvent être gardées dans le cache local. Les services externes appliquent leurs propres politiques. |

L’hébergement peut traiter le chemin HTTP, l’adresse IP et d’autres informations opérationnelles. L’application ne crée pas de journal de scans. Le limiteur utilise en mémoire une clé issue de l’adresse transmise par le proxy, sans contenu de requête. La durée des journaux de la plateforme relève de sa configuration.

## Caméra

Les images de la caméra sont analysées dans le navigateur et ne sont pas envoyées. Le flux s’arrête après la lecture, au départ de l’écran ou à la suspension. Le refus laisse la saisie et la recherche disponibles. Le bêta OCR est désactivé par défaut en production.
