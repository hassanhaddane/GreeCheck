# GreeCheck 3.0 · rapport qualité

Contrôles réalisés le 6 novembre 2026 sur le candidat. La suite Playwright Chromium utilise les fixtures du dépôt et les contrôles caméra dessinent les codes dans un flux vidéo synthétique. Le plugin Browser n’est pas disponible dans cette session. Playwright et le client Vercel permettent de séparer les mesures locales des réponses du déploiement.

## Portes locales

| Contrôle | Résultat |
| --- | --- |
| Lint app et domaine | Réussi |
| TypeScript app et domaine | Réussi |
| Tests Node unitaires et d’intégration | 283 tests réussis |
| Build Next.js 16.4.5 | Réussi |
| Audit npm intégral | 0 vulnérabilité rapportée |
| Playwright Linux Chromium | 66 tests réussis, dont 14 contrôles axe et 15 captures visuelles |
| Smoke réel | OFF produit, texte et catégories réussis au dernier passage. Catégorie indisponible au premier passage. Overpass non concluant. USDA non configurée. |

Playwright couvre la première visite, EAN-8 et QR synthétiques, le refus et le changement de caméra, la saisie manuelle, la recherche, la note et l’état non évaluable, GreeSwap, les favoris, l’historique, la purge locale, les critères, la navigation et le RTL. Les tests PWA couvrent les copies en cache, la relance, la transition de version avec données locales et l’exclusion des recherches à paramètres de CacheStorage. La suite inclut 14 contrôles axe et 15 captures de non-régression.

Les itérations ont détecté des échecs de démarrage du worker, de décodage QR de canonical attendu et de libellés dupliqués pour la saisie manuelle. Les causes ont été corrigées. Des arrêts du processus Chromium Headless Shell au démarrage de certains contextes ont été observés. La configuration utilise Chromium en mode headless complet avec des flux canvas contrôlés. Le premier passage GitHub Actions a aussi refusé des entrées multiplateformes absentes du lockfile. Le lockfile a été complété avec Node 24.22.2 et npm 11.19.1.

## Mesures en laboratoire

Cinq sessions froides par écran et par version, Chromium avec profil Pixel 7, CPU ralenti 4×, 150 ms de latence, 1,6 Mbit/s descendant, service worker neutralisé pour isoler le premier chargement et caméra synthétique. L’interaction de l’accueil ouvre le menu. Celle du scanner change le mode une fois le décodeur prêt. Les mesures proviennent de web-vitals. Les octets sont les scripts de même origine transférés durant ce scénario. Ils incluent les imports déclenchés par le scénario, pas la seule taille du bundle initial.

| Écran et version | LCP p75 | INP p75 | CLS p75 | JS transféré p75 |
| --- | ---: | ---: | ---: | ---: |
| Accueil, prompt 05 | 800 ms | 488 ms | 0 | 234 996 o |
| Scanner, prompt 05 | 7 560 ms | 1 752 ms | 0,183 | 472 417 o |
| Accueil, candidat | 800 ms | 624 ms | 0 | 222 531 o |
| Scanner, candidat | 7 328 ms | 64 ms | 0,033 | 439 032 o |

Le JavaScript transféré et le CLS du scanner diminuent. Dans cette mesure, le LCP du scanner et l’INP de l’accueil dépassent encore les seuils de référence. Les seuils de terrain s’appliquent au p75 des visites réelles. La taille de l’échantillon, l’émulation et les interactions de ce script ne constituent pas une mesure de terrain. Commande reproductible npm run measure:vitals -- http://127.0.0.1:3100 5. [Core Web Vitals](https://web.dev/articles/vitals)

## Limites d’acceptation

Les contrôles locaux valident le parcours avec fixtures et la gestion des indisponibilités. L’accès réseau réel dépend des quotas et des fournisseurs. Le lancement sur iPhone et Android physiques, le focus de caméra, l’installation, l’écran de lancement, la reprise en standalone et les lecteurs d’écran nécessitent la [checklist appareils](SHOPPING_DEVICE_CHECKLIST.md). Les résultats axe constituent une vérification partielle du niveau [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/).

La [checklist de lancement](PRODUCTION_READINESS.md) sépare la preview protégée de la promotion de production.
