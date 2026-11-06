# Validation du parcours courses sur appareils

Les tests automatisés utilisent des produits de référence et un flux vidéo synthétique contenant un EAN-8. Ils couvrent le décodage ZXing, la déduplication pendant une requête lente, la fermeture du flux, les refus, le résultat incomplet, les allergènes, les alternatives et la réouverture depuis IndexedDB. La checklist ci-dessous reste à exécuter sur des téléphones physiques.

## Préparer la session

- Servir le build à tester sur une URL HTTPS accessible au téléphone. Noter le commit, le modèle, la version du système, la version du navigateur et la langue.
- Exécuter chaque étape sur un iPhone dans Safari et sur un Android dans Chrome, puis vérifier les étapes de reprise et de relance dans la PWA installée depuis chaque navigateur.
- Préparer des emballages EAN-13, EAN-8 et UPC-A, et un UPC-E si disponible. Relever les codes imprimés et les données attendues auprès de la source. Préparer un produit incomplet, un code valide absent du catalogue et un produit qui signale un allergène de test. Configurer ce dernier dans les critères locaux.
- Faire une première ouverture en ligne et laisser la PWA terminer l'installation de son service worker. Pour la vérification hors ligne, scanner un produit et quitter son verdict rapide sans ouvrir la fiche détaillée.

## Checklist

| Parcours | Résultat attendu | Safari iOS | Chrome Android |
| --- | --- | --- | --- |
| Premier scan et permission accordée | L'aperçu reste dans la page, sans son ni plein écran forcé. La caméra arrière est demandée. Scanner sans accueil obligatoire. | À vérifier | À vérifier |
| Formats et conditions de rayon | Identifier chaque emballage par son code imprimé. Essayer lumière faible, emballage brillant et distances différentes. Relever le délai lecture → identité et les échecs de mise au point. | À vérifier | À vérifier |
| Sélection de caméra et lampe | Le sélecteur propose les caméras exposées après permission. Changer de caméra libère le flux précédent. La lampe apparaît seulement si la piste accepte son contrôle. Vérifier l'allumage et l'extinction réels. | À vérifier | À vérifier |
| Retour haptique | Après interaction et lorsque le système l'autorise, vérifier un retour bref à la lecture. Désactiver la vibration du système et vérifier que le verdict reste lisible. | À vérifier | À vérifier |
| Refus, indisponibilité et nouvel essai | Refuser la permission puis scanner via saisie manuelle, coller un code et essayer la recherche par nom. Réactiver la permission dans le navigateur et utiliser Réessayer. Tester aussi caméra occupée ou indisponible. | À vérifier | À vérifier |
| Scans répétés et arrêt | Garder le code sous la caméra pendant une réponse lente. Attendre un seul verdict et une seule recherche. Scanner un autre produit. Quitter la page ou verrouiller le téléphone pendant une permission en attente. L'indicateur caméra doit s'éteindre, y compris si la permission est accordée après le départ. | À vérifier | À vérifier |
| Produit absent ou incomplet | Vérifier le code et le lien officiel de contribution pour un produit absent. Pour un produit incomplet, vérifier l'identité, les faits connus, la raison et le statut Non évaluable. | À vérifier | À vérifier |
| Allergène et alternative | Vérifier l'alerte au-dessus du verdict. Ouvrir GreeSwap. Contrôler que chaque suggestion a le même usage et que le delta correspond aux valeurs déclarées. Une réponse vide explique l'absence de suggestion. | À vérifier | À vérifier |
| Réseau lent puis coupé | Afficher l'identification en cours pendant la requête. Reprendre la recherche avec le même code après une erreur. En mode avion, relancer la PWA et ouvrir le scan précédent depuis Récents. Vérifier la mention de copie locale et l'absence de note sur une fiche inconnue. | À vérifier | À vérifier |
| Changement de langue et données locales | Passer du FR à l'EN puis à l'AR. Vérifier le RTL, les alertes et les chiffres du code. Supprimer une ligne, puis vider les récents après confirmation et rouvrir l'application. Les favoris et la liste restent accessibles. | À vérifier | À vérifier |

## Règles à vérifier

GreeSwap demande une famille précise, une base commune par 100 g ou 100 ml, une amélioration mesurable et un gain GS-3 d'au moins huit points. Il limite l'affichage à trois produits. Les écarts ne sont calculés que sur des valeurs renseignées et comparables. Les critères de comparaison par 100 g et par 100 ml reprennent les seuils d'étiquetage des tables 2 et 3 du guide britannique. GreeSwap écarte les nouveaux problèmes dépassant le seuil, ainsi que les hausses d'au moins 20 % sur un critère déjà élevé. [Guide britannique d’étiquetage nutritionnel](https://www.food.gov.uk/sites/default/files/media/document/fop-guidance_0.pdf)

Avec un allergène sélectionné, GreeSwap exige des ingrédients, des déclarations d'allergènes et des traces renseignés, puis écarte toute correspondance connue. L'emballage reste à vérifier. Les restrictions de régime exigent une confirmation disponible dans la source. Les critères personnels influencent les alertes et l'ordre des suggestions. GS-3 conserve sa note de référence.

La recherche applique le délai de saisie existant de 600 ms. La requête textuelle conserve les langues du fournisseur. Quelques variantes orthographiques sont normalisées dans une seule requête. Les synonymes et les fautes d'une lettre interviennent sur le classement des résultats déjà renvoyés. La couverture reste celle du catalogue.

Le service worker conserve des pages publiques de la PWA. Les produits et préférences restent dans IndexedDB. Une fiche jamais visitée présente un résumé de la copie locale hors ligne si le code est en cache. La consultation de la fiche complète dépend de son chargement antérieur et de la conservation des ressources par le navigateur.

Le scanner utilise le contexte sécurisé, la vidéo muette en ligne et les capacités effectivement exposées par la piste. La vibration dépend de l'activation de la page et du support du navigateur. [W3C Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/) · [W3C MediaStream Image Capture](https://www.w3.org/TR/image-capture/) · [WebKit et lecture vidéo sur iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/) · [W3C Vibration API](https://www.w3.org/TR/vibration/)
