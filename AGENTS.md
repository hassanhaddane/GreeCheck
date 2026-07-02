## Imported Claude Cowork project instructions

# Cahier des charges — GreeCheck

## 1. Présentation du projet

**Nom du produit :** GreeCheck
**Slogan :** Scanne. Comprends. Choisis mieux.
**Type :** Plateforme web/PWA nutritionnelle premium, pensée pour évoluer ensuite vers Android/iOS.
**Positionnement :** Alternative plus moderne, plus intelligente et plus personnalisée que Yuka, avec une expérience premium, minimaliste et futuriste.

GreeCheck est une application web/PWA permettant aux utilisateurs de scanner ou rechercher des produits alimentaires afin de comprendre rapidement leur qualité nutritionnelle, leur niveau de transformation, leurs additifs, leurs allergènes, leurs labels, leur compatibilité halal, leur impact santé et leur cohérence avec les objectifs personnels de l’utilisateur.

L’objectif n’est pas de faire une simple copie de Yuka, mais de créer une expérience plus moderne, plus visuelle et plus intelligente, avec un système de score personnalisé appelé **GreeScore**.

---

## 2. Vision produit

GreeCheck doit devenir une plateforme nutritionnelle simple, premium et internationale, capable d’aider tout utilisateur à faire de meilleurs choix alimentaires sans avoir besoin de connaissances nutritionnelles.

L’application doit répondre à trois actions principales :

1. **Scanner** un produit.
2. **Comprendre** clairement ce qu’il contient.
3. **Choisir mieux** grâce à un score personnalisé, des explications simples et des alternatives.

La philosophie du produit repose sur quatre piliers :

* **Clarté** : chaque information doit être compréhensible en quelques secondes.
* **Personnalisation** : le score doit s’adapter au profil local de l’utilisateur.
* **Confidentialité** : aucune donnée personnelle n’est stockée côté serveur.
* **Expérience premium** : interface fluide, moderne, visuelle, proche d’Apple Health et des apps fintech.

---

## 3. Public cible

### Cible principale

* Grand public international.
* Personnes souhaitant consommer plus sainement.
* Personnes voulant privilégier les produits bio.
* Utilisateurs musulmans souhaitant identifier les produits halal.
* Personnes allergiques ou sensibles à certains ingrédients.
* Sportifs ou personnes surveillant sucre, sel, protéines, fibres, calories.
* Familles souhaitant mieux comprendre les produits du quotidien.

### Langues

L’application doit être disponible en :

* Français.
* Anglais.
* Arabe.

L’arabe doit être prévu avec une vraie compatibilité RTL, même si l’implémentation finale peut se faire progressivement.

---

## 4. Identité visuelle

### Direction artistique

GreeCheck doit avoir une identité :

* Premium.
* Minimaliste.
* Futuriste.
* Claire.
* Inspirée Apple Health.
* Inspirée fintech moderne.
* Avec une base blanche premium.
* Avec un vert naturel et un vert néon futuriste en accent.

### Ambiance visuelle

L’interface doit donner une impression de :

* santé,
* technologie,
* confiance,
* précision,
* fraîcheur,
* modernité,
* simplicité.

### Palette recommandée

* Blanc premium : `#FAFAF7`
* Blanc pur : `#FFFFFF`
* Noir doux : `#101312`
* Gris texte : `#66706A`
* Vert naturel : `#2ECC71`
* Vert néon : `#39FF88`
* Vert profond : `#0B3D2E`
* Fond glass : `rgba(255,255,255,0.72)`

### Style UI

* Cards arrondies.
* Glassmorphism léger.
* Ombres très subtiles.
* Grandes zones respirantes.
* Typographie moderne.
* Micro-animations.
* Transitions fluides.
* Badges colorés très lisibles.
* Visualisations nutritionnelles modernes.
* Scan avec overlay futuriste.

---

## 5. Plateforme cible

### Version 1

La V1 doit être une **web app/PWA** responsive, utilisable sur desktop, tablette et mobile.

La PWA doit permettre :

* installation sur mobile,
* mode plein écran,
* accès caméra pour scan,
* interface mobile-first,
* stockage local,
* expérience proche d’une app native.

### Évolution future

Le projet doit être structuré pour pouvoir évoluer vers :

* Android,
* iOS,
* éventuellement React Native / Expo plus tard.

L’architecture doit donc séparer :

* logique métier,
* scoring,
* mapping API,
* UI components,
* stockage local,
* traductions.

---

## 6. Principe privacy-first

GreeCheck ne doit pas demander de compte utilisateur en V1.

### Règles obligatoires

* Aucun compte.
* Aucune authentification.
* Aucune base de données utilisateur.
* Aucun profil serveur.
* Aucune donnée santé stockée côté serveur.
* Aucun historique envoyé au backend.
* Les préférences restent sur l’appareil.
* Les favoris restent sur l’appareil.
* Le panier reste sur l’appareil.
* L’historique reste sur l’appareil.
* Les objectifs restent sur l’appareil.

### Message à afficher dans l’app

L’application doit afficher clairement :

> Vos données restent sur votre appareil. GreeCheck ne crée pas de compte, ne stocke pas votre profil santé et ne conserve pas votre historique de scan.

### Stockage local

Utiliser :

* `localStorage` pour préférences simples.
* `IndexedDB` pour historique, favoris, panier, cache local.
* Chiffrement local optionnel pour les préférences sensibles.

---

## 7. Modèle économique

GreeCheck sera gratuit.

### Monétisation prévue

* Publicités dans l’application.
* Publicités sur la plateforme web.

### Règle de cohérence avec la confidentialité

Comme GreeCheck promet de ne pas stocker de données personnelles, la publicité doit être pensée en priorité comme :

* publicité contextuelle,
* publicité non personnalisée,
* sans profilage utilisateur côté GreeCheck.

Si des publicités personnalisées ou des SDK avec traceurs sont utilisés, l’application devra intégrer :

* bannière de consentement claire,
* bouton accepter,
* bouton refuser,
* gestion des préférences,
* politique de confidentialité simple.

---

## 8. Sources de données

### Source principale

**Open Food Facts**

Utilisation prévue :

* recherche par code-barres,
* recherche texte,
* récupération des ingrédients,
* récupération des valeurs nutritionnelles,
* récupération des allergènes,
* récupération du Nutri-Score,
* récupération du NOVA,
* récupération du Green-Score / Eco-Score si disponible,
* récupération des labels,
* récupération des tags bio/vegan/végétarien/halal si disponibles,
* récupération des images produit.

### Sources secondaires

#### Ciqual / ANSES

Utilisation :

* enrichissement nutritionnel pour aliments génériques,
* comparaison entre produit transformé et aliment brut,
* référence nutritionnelle française.

#### USDA FoodData Central

Utilisation :

* enrichissement international,
* données nutritionnelles pour produits ou aliments non couverts en Europe,
* fallback pour recherche globale.

### Contribution

Si un produit n’est pas trouvé, GreeCheck doit proposer :

* message clair,
* lien ou parcours de contribution Open Food Facts,
* possibilité de scanner/ajouter les informations côté Open Food Facts,
* pas de base interne propriétaire en V1.

---

## 9. Entrées utilisateur

L’utilisateur peut choisir librement entre :

1. Scan code-barres.
2. Scan QR code.
3. Recherche texte.
4. Recherche avancée par filtres.
5. Scan Battle.
6. Panier intelligent.

### Scan code-barres

Fonction principale de l’application.

Le scan doit :

* ouvrir la caméra,
* détecter rapidement le code-barres,
* afficher une animation premium,
* récupérer le produit via API,
* afficher le GreeScore,
* expliquer le résultat.

### Scan QR code

Le QR code doit être supporté comme entrée possible.

Si le QR code contient :

* un code produit,
* une URL produit,
* une référence exploitable,

GreeCheck tente de l’analyser.

### Recherche texte

L’utilisateur peut rechercher :

* un nom de produit,
* une marque,
* une catégorie,
* un besoin nutritionnel.

Exemples :

* “céréales sans sucre”
* “yaourt protéiné”
* “sauce tomate bio”
* “chips sans additifs”
* “produit halal”
* “snack faible en sel”

---

## 10. Fonctionnalités principales

## 10.1 Écran d’accueil app

L’application doit s’ouvrir directement sur l’expérience produit, pas sur une page marketing classique.

L’écran d’accueil contient :

* logo GreeCheck,
* slogan court,
* bouton Scan,
* bouton Recherche,
* bouton Scan Battle,
* bouton Panier intelligent,
* accès rapide aux filtres,
* historique local récent,
* message privacy-first.

Structure recommandée :

* Hero compact.
* Carte scan principale.
* Actions rapides.
* Section “Aujourd’hui”.
* Section “Découvre mieux ce que tu consommes”.

---

## 10.2 GreeLens

GreeLens est l’expérience de scan futuriste de GreeCheck.

### Objectif

Créer une sensation unique lors du scan.

### UX

Pendant le scan :

* overlay caméra futuriste,
* cadre lumineux vert,
* effet radar,
* micro-animation de détection,
* message “Analyse du produit…”
* retour visuel immédiat.

Après scan :

* apparition du score,
* carte produit animée,
* résumé instantané,
* bouton “Comprendre”,
* bouton “Comparer”,
* bouton “Trouver mieux”.

---

## 10.3 Fiche produit

La fiche produit est l’écran central.

Elle doit afficher :

* image produit,
* nom produit,
* marque,
* code-barres,
* pays si disponible,
* labels principaux,
* badge halal si détecté,
* badge bio si détecté,
* GreeScore global,
* Nutri-Score,
* NOVA,
* Green-Score,
* résumé en langage simple,
* radar nutritionnel,
* alertes importantes,
* ingrédients,
* allergènes,
* additifs,
* valeurs nutritionnelles,
* alternatives,
* bouton Scan Battle,
* bouton ajouter au panier,
* bouton favori local.

### Résumé simple

Exemple :

> Bon choix global, mais attention au sucre. Produit peu transformé, sans additif critique détecté, compatible avec ton objectif “réduire les additifs”.

---

## 10.4 GreeScore

Le GreeScore est le score propriétaire de GreeCheck.

### Format

Afficher plusieurs formats :

* score sur 100,
* couleur,
* lettre A/B/C/D/E,
* badge texte.

Exemples :

* 92 — Excellent
* 76 — Bon choix
* 58 — Moyen
* 34 — À limiter
* 12 — À éviter

### Objectif

Le GreeScore doit être plus intelligent qu’un score nutritionnel classique, car il combine :

* nutrition,
* transformation,
* additifs,
* allergènes,
* labels,
* bio,
* halal,
* environnement,
* objectif personnel local,
* filtres de l’utilisateur.

### Scores secondaires

Afficher aussi :

* Score santé.
* Score naturalité.
* Score transformation.
* Score additifs.
* Score objectif.
* Score écologie si données disponibles.

---

## 10.5 Personnalisation locale

Même sans compte, l’utilisateur peut configurer son profil local.

### Données possibles

* objectif principal,
* allergies,
* régime alimentaire,
* préférence halal,
* préférence bio,
* préférence vegan,
* préférence végétarien,
* réduction sucre,
* réduction sel,
* réduction gras saturés,
* augmentation protéines,
* augmentation fibres,
* éviter additifs,
* éviter huile de palme,
* éviter ultra-transformé,
* mode enfant non retenu en V1.

### Important

Ces informations ne sont jamais envoyées à une base utilisateur.

Elles servent uniquement à adapter :

* GreeScore,
* filtres,
* alertes,
* recommandations,
* alternatives.

---

## 10.6 Objectifs utilisateur

L’utilisateur peut choisir un ou plusieurs objectifs :

* Manger plus sain.
* Consommer bio.
* Réduire sucre.
* Réduire sel.
* Réduire additifs.
* Éviter ultra-transformé.
* Prise de muscle.
* Perte de poids.
* Alimentation halal.
* Alimentation végétarienne.
* Alimentation vegan.
* Riche en fibres.
* Riche en protéines.
* Faible calories.
* Meilleure digestion.

Le scoring doit s’adapter à ces objectifs.

Exemple :

Un produit riche en protéines peut avoir un bonus pour un sportif, mais perdre des points s’il contient trop d’additifs ou trop de sucre.

---

## 10.7 Filtres ultra intelligents

La recherche doit proposer des filtres classiques et intelligents.

### Filtres classiques

* Nutri-Score A/B/C/D/E.
* NOVA 1/2/3/4.
* Bio.
* Halal.
* Vegan.
* Végétarien.
* Sans gluten.
* Sans lactose.
* Sans huile de palme.
* Sans additifs.
* Faible sucre.
* Faible sel.
* Riche en protéines.
* Riche en fibres.
* Faible gras saturés.
* Green-Score élevé.

### Filtres intelligents

* Meilleur pour prise de muscle.
* Meilleur pour perte de poids.
* Meilleur pour petit-déjeuner.
* Meilleur pour snack sain.
* Meilleur pour enfant, option future.
* Compatible halal.
* Clean label.
* Moins transformé.
* Moins sucré que la moyenne.
* Meilleur choix bio.
* Alternative plus saine.
* Alternative plus naturelle.
* Bon avant sport.
* À éviter le soir.
* Meilleur choix en supermarché.

### UX des filtres

Les filtres doivent être visuels :

* chips interactifs,
* icônes,
* état actif clair,
* combinaison multiple,
* résumé des filtres actifs,
* bouton reset.

---

## 10.8 Scan Battle

Scan Battle doit être une fonctionnalité mise en avant.

### Principe

L’utilisateur scanne deux ou trois produits, et GreeCheck choisit le meilleur.

### Nombre de produits

V1 : jusqu’à 3 produits.

### Résultat

Afficher :

* vainqueur,
* score global,
* comparaison sucre/sel/gras/protéines/fibres,
* additifs,
* NOVA,
* labels,
* compatibilité objectif,
* explication claire.

### Exemple de verdict

> Choisis le produit 2 : il est moins sucré, moins transformé, contient plus de fibres et correspond mieux à ton objectif “manger plus sain”.

### UI

* cartes produit côte à côte,
* podium,
* badge “Best Choice”,
* tableau comparatif,
* radar comparatif,
* bouton “Remplacer dans mon panier”.

---

## 10.9 Panier intelligent

Le panier intelligent permet de scanner plusieurs produits et de noter l’ensemble.

### Fonctionnalités

* Ajouter un produit au panier.
* Scanner plusieurs produits.
* Voir score moyen du panier.
* Voir alertes cumulées.
* Voir total sucre/sel/gras estimé si quantité disponible.
* Voir ratio bons/moyens/mauvais produits.
* Proposer des remplacements.
* Donner une note finale au panier.

### Résultat

Afficher :

* Score panier sur 100.
* Niveau global : Excellent / Correct / À améliorer.
* Produits à remplacer en priorité.
* Alternatives recommandées.
* Répartition NOVA.
* Répartition Nutri-Score.
* Score bio.
* Score halal si filtre activé.

### Exemple

> Ton panier est correct, mais 3 produits tirent le score vers le bas : céréales trop sucrées, sauce ultra-transformée, snack salé. Remplace-les pour gagner +18 points.

---

## 10.10 Nutrition Radar

Chaque produit doit avoir une visualisation radar.

### Axes recommandés

* Sucre.
* Sel.
* Gras saturés.
* Protéines.
* Fibres.
* Additifs.
* Transformation.

### Objectif

Comprendre visuellement le profil du produit en 2 secondes.

### UX

* Radar simple.
* Couleurs cohérentes.
* Score global au centre.
* Message résumé sous le radar.

---

## 10.11 Alternatives produits

Quand un produit est moyen ou mauvais, GreeCheck propose des alternatives.

### Sources

* Open Food Facts.
* Recherche par même catégorie.
* Recherche par meilleur Nutri-Score.
* Recherche par NOVA plus bas.
* Recherche par labels.
* Recherche par compatibilité objectif.

### Types d’alternatives

* Plus saine.
* Plus bio.
* Plus naturelle.
* Moins transformée.
* Moins sucrée.
* Moins salée.
* Plus protéinée.
* Compatible halal.
* Meilleure pour l’objectif choisi.

### Affichage

Chaque alternative doit afficher :

* image,
* nom,
* marque,
* score,
* raison de recommandation,
* différence principale,
* bouton comparer.

---

## 10.12 Carte et géolocalisation

La V1 doit intégrer une dimension géolocalisation.

### Objectifs

* Trouver des magasins autour de soi.
* Rechercher des lieux liés à la nutrition saine.
* Afficher des supermarchés, magasins bio, épiceries, marchés, magasins halal si possible.
* Permettre à l’utilisateur de chercher autour d’une ville.

### Approche

Utiliser une carte interactive.

Sources possibles :

* OpenStreetMap.
* Overpass API.
* Nominatim pour recherche géographique.
* Géolocalisation navigateur avec consentement.

### UX

* Carte claire.
* Recherche par ville.
* Bouton “autour de moi”.
* Filtres : bio, supermarché, halal, marché, épicerie.
* Respect de la confidentialité : localisation utilisée uniquement localement pour la recherche.

---

## 10.13 Liste de courses intelligente

GreeCheck doit inclure une liste de courses locale.

### Fonctionnalités

* Créer une liste.
* Ajouter des produits.
* Ajouter des alternatives.
* Classer par rayon.
* Voir score estimé de la liste.
* Générer une liste selon objectif sans IA, via règles.
* Filtrer la liste par bio/halal/faible sucre/protéiné.

### Sans IA

La génération doit être basée sur :

* catégories,
* règles nutritionnelles,
* produits favoris,
* alternatives recommandées,
* objectifs utilisateur.

---

## 10.14 Historique local

L’utilisateur doit pouvoir consulter ses scans récents.

### Données stockées localement

* produit scanné,
* date,
* score,
* image,
* verdict,
* statut favori,
* panier associé si applicable.

### Actions

* supprimer un scan,
* vider l’historique,
* ajouter aux favoris,
* comparer à nouveau,
* ajouter au panier.

---

## 10.15 Favoris locaux

L’utilisateur peut sauvegarder des produits en favoris.

### Fonctionnalités

* Ajouter/retirer favori.
* Filtrer favoris.
* Comparer favoris.
* Ajouter favori au panier.
* Voir évolution des scores si le produit est rafraîchi.

---

## 10.16 Contribution Open Food Facts

Quand le produit n’existe pas ou est incomplet :

* afficher un état “Produit non trouvé”,
* expliquer que la base est collaborative,
* proposer de contribuer à Open Food Facts,
* rediriger vers le parcours de contribution,
* ne pas créer de base propriétaire en V1.

---

## 11. Ce qui est exclu en V1

Pour garder un périmètre clair :

* Pas de compte utilisateur.
* Pas d’authentification.
* Pas de base de données utilisateur.
* Pas de réseau social.
* Pas de communauté.
* Pas de gamification.
* Pas d’IA.
* Pas de chatbot.
* Pas de journal alimentaire complet.
* Pas de suivi médical.
* Pas de cosmétiques.
* Pas de profil famille en V1.
* Pas de tracking personnel côté serveur.

---

## 12. Architecture technique

## 12.1 Stack recommandée

### Frontend

* Next.js.
* React.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* Framer Motion.
* PWA.
* next-intl ou équivalent pour FR/EN/AR.
* Zustand pour état local.
* IndexedDB via Dexie.js.
* Barcode scanner via librairie web compatible caméra.

### Backend léger

Pas de backend utilisateur obligatoire.

Utiliser uniquement :

* Next.js API routes,
* ou Supabase Edge Functions,
* ou serveur proxy léger.

Objectifs du backend léger :

* appeler Open Food Facts avec User-Agent correct,
* éviter d’exposer certaines clés si sources secondaires,
* normaliser les réponses API,
* gérer les fallbacks,
* ne pas stocker de données utilisateur.

### Stockage local

* IndexedDB pour historique, favoris, panier, cache local.
* localStorage pour thème, langue, préférences rapides.
* Aucun profil serveur.

### Sources externes

* Open Food Facts.
* Ciqual/ANSES.
* USDA FoodData Central.
* OpenStreetMap / Overpass / Nominatim.

---

## 12.2 Structure de projet recommandée

```txt
greecheck/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx
│   │   ├── scan/
│   │   ├── search/
│   │   ├── product/[barcode]/
│   │   ├── battle/
│   │   ├── basket/
│   │   ├── map/
│   │   ├── settings/
│   │   └── privacy/
│   ├── api/
│   │   ├── product/
│   │   ├── search/
│   │   ├── alternatives/
│   │   └── places/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── scan/
│   ├── product/
│   ├── score/
│   ├── radar/
│   ├── battle/
│   ├── basket/
│   ├── filters/
│   └── map/
├── lib/
│   ├── api/
│   ├── scoring/
│   ├── nutrition/
│   ├── storage/
│   ├── i18n/
│   ├── utils/
│   └── constants/
├── stores/
│   ├── preferences-store.ts
│   ├── basket-store.ts
│   ├── history-store.ts
│   └── favorites-store.ts
├── types/
│   ├── product.ts
│   ├── scoring.ts
│   ├── user-preferences.ts
│   └── api.ts
└── public/
```

---

## 13. Modèle de données local

### Product

```ts
type Product = {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  quantity?: string;
  categories?: string[];
  labels?: string[];
  countries?: string[];
  ingredientsText?: string;
  allergens?: string[];
  additives?: string[];
  traces?: string[];
  nutriments: Nutriments;
  nutriScore?: "a" | "b" | "c" | "d" | "e";
  novaGroup?: 1 | 2 | 3 | 4;
  greenScore?: "a" | "b" | "c" | "d" | "e";
  isBio?: boolean;
  isHalal?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  source: "openfoodfacts" | "ciqual" | "usda";
};
```

### LocalPreferences

```ts
type LocalPreferences = {
  language: "fr" | "en" | "ar";
  goals: UserGoal[];
  avoidAllergens: string[];
  preferBio: boolean;
  preferHalal: boolean;
  preferVegan: boolean;
  preferVegetarian: boolean;
  reduceSugar: boolean;
  reduceSalt: boolean;
  reduceAdditives: boolean;
  reduceUltraProcessed: boolean;
  increaseProtein: boolean;
  increaseFiber: boolean;
};
```

### GreeScore

```ts
type GreeScore = {
  global: number;
  grade: "A" | "B" | "C" | "D" | "E";
  label: "Excellent" | "Bon choix" | "Moyen" | "À limiter" | "À éviter";
  healthScore: number;
  naturalityScore: number;
  processingScore: number;
  additivesScore: number;
  goalScore: number;
  ecologyScore?: number;
  reasons: ScoreReason[];
  warnings: ProductWarning[];
};
```

---

## 14. Algorithme GreeScore

Le GreeScore doit être transparent, déterministe et sans IA.

### Base de score

Score global sur 100.

Répartition recommandée :

* 35% qualité nutritionnelle.
* 20% niveau de transformation.
* 15% additifs/allergènes/ingrédients sensibles.
* 10% labels positifs.
* 10% compatibilité objectif utilisateur.
* 10% impact environnemental si disponible.

### Nutrition

Prendre en compte :

* Nutri-Score.
* Calories.
* Sucre.
* Sel.
* Gras saturés.
* Fibres.
* Protéines.

### Transformation

Prendre en compte NOVA :

* NOVA 1 : bonus fort.
* NOVA 2 : bonus léger.
* NOVA 3 : neutre ou malus léger.
* NOVA 4 : malus fort.

### Additifs

Chaque additif doit être classé :

* neutre,
* à surveiller,
* controversé,
* à éviter.

Le score baisse selon la quantité et la sévérité.

### Labels

Bonus possibles :

* bio,
* halal si préférence activée,
* vegan si préférence activée,
* végétarien si préférence activée,
* commerce équitable si disponible,
* sans huile de palme,
* clean label.

### Personnalisation

Si l’utilisateur choisit “réduire sucre”, le sucre pèse plus lourd.

Si l’utilisateur choisit “prise de muscle”, protéines et ratio calories/protéines pèsent plus lourd.

Si l’utilisateur choisit “halal”, les produits halal gagnent un bonus, les produits contenant ingrédients douteux ou alcool/porc détectés déclenchent une alerte.

---

## 15. États produit

Chaque produit doit pouvoir être dans un état clair :

* Produit trouvé.
* Produit partiellement complet.
* Produit incomplet.
* Produit non trouvé.
* Données nutritionnelles manquantes.
* Ingrédients manquants.
* Score calculé avec confiance élevée.
* Score calculé avec confiance moyenne.
* Score impossible.

### Score de confiance

GreeCheck doit afficher un indicateur de confiance :

* Données complètes : confiance élevée.
* Ingrédients absents : confiance moyenne.
* Nutriments absents : confiance faible.
* Produit incomplet : score partiel.

---

## 16. Pages principales

### 16.1 Home App

* Scan principal.
* Recherche.
* Scan Battle.
* Panier.
* Historique récent.
* Message privacy-first.
* Accès paramètres.

### 16.2 Scan

* Caméra.
* Overlay GreeLens.
* Choix code-barres / QR code.
* Recherche manuelle fallback.
* Résultat animé.

### 16.3 Recherche

* Barre de recherche.
* Filtres intelligents.
* Résultats produits.
* Tri par GreeScore.
* Tri par Nutri-Score.
* Tri par bio/halal/NOVA.

### 16.4 Fiche produit

* Résumé produit.
* GreeScore.
* Nutrition Radar.
* Ingrédients.
* Additifs.
* Allergènes.
* Labels.
* Alternatives.
* Actions.

### 16.5 Scan Battle

* Ajouter jusqu’à 3 produits.
* Comparaison visuelle.
* Verdict.
* Tableau.
* Radar.
* Alternative gagnante.

### 16.6 Panier

* Liste produits scannés.
* Score panier.
* Alertes.
* Remplacements.
* Répartition nutritionnelle.
* Export local optionnel.

### 16.7 Carte

* Recherche ville.
* Autour de moi.
* Magasins bio.
* Supermarchés.
* Magasins halal.
* Marchés.
* Épiceries.

### 16.8 Paramètres

* Langue.
* Préférences locales.
* Objectifs.
* Allergènes.
* Confidentialité.
* Gestion historique.
* Gestion cookies/ads.

### 16.9 Confidentialité

* Explication stockage local.
* Aucune création de compte.
* Aucune base utilisateur.
* Gestion publicités.
* Attribution Open Food Facts.
* Licences de données.

---

## 17. Responsive et PWA

L’application doit être mobile-first.

### Mobile

* navigation bottom bar,
* scan central,
* boutons larges,
* cards verticales,
* interactions au pouce,
* transitions fluides.

### Desktop

* layout plus large,
* sidebar possible,
* comparateur horizontal,
* dashboard plus riche,
* carte plus grande.

### PWA

* manifest,
* icônes,
* thème,
* splash screen,
* offline fallback,
* installation mobile,
* service worker.

---

## 18. Performance

Objectifs :

* chargement initial rapide,
* scan fluide,
* animation sans lag,
* lazy loading images,
* cache local des produits consultés,
* requêtes API limitées,
* skeleton loading,
* fallback clair en cas d’erreur API.

---

## 19. Accessibilité

* Contrastes élevés.
* Navigation clavier.
* Labels ARIA.
* Textes lisibles.
* Support RTL.
* Messages simples.
* Pas uniquement des couleurs pour comprendre les scores.

---

## 20. Sécurité et confidentialité

* Pas de données sensibles serveur.
* Pas de compte.
* Pas de tracking interne personnel.
* Nettoyage local possible.
* Politique de confidentialité simple.
* Consentement pour géolocalisation.
* Consentement pour publicité si nécessaire.
* Aucun conseil médical personnalisé.
* Application d’information nutritionnelle uniquement.

---

## 21. MVP V1 attendu

La V1 doit être impressionnante visuellement et complète techniquement.

### Inclus V1

* Home app premium.
* Scan code-barres.
* Scan QR code.
* Recherche texte.
* Fiche produit complète.
* GreeScore personnalisé.
* Nutri-Score/NOVA/Green-Score.
* Bio/halal labels.
* Filtres intelligents.
* Nutrition Radar.
* Scan Battle jusqu’à 3 produits.
* Panier intelligent.
* Alternatives.
* Historique local.
* Favoris locaux.
* Préférences locales.
* Carte géolocalisée.
* FR/EN/AR.
* PWA.
* Ads placeholders.
* Privacy-first.

### Exclu V1

* IA.
* Compte.
* Auth.
* Base utilisateur.
* Réseau social.
* Gamification.
* Journal alimentaire complet.
* Cosmétiques.
* App native Android/iOS.

---

## 22. Critères d’acceptation

Le projet est validé si :

* l’utilisateur peut scanner un produit réel,
* les données Open Food Facts s’affichent correctement,
* le GreeScore est calculé localement,
* les préférences modifient réellement le score,
* les données utilisateur restent locales,
* le Scan Battle compare 2 à 3 produits,
* le panier intelligent calcule une note globale,
* les filtres fonctionnent,
* les alternatives sont pertinentes,
* l’interface est premium et futuriste,
* la PWA est installable,
* le site fonctionne sur mobile,
* FR/EN/AR sont prévus,
* aucun compte n’est demandé,
* les messages de confidentialité sont visibles.

---

## 23. Direction finale

GreeCheck doit être perçu comme :

* plus premium que Yuka,
* plus visuel,
* plus intelligent,
* plus personnalisé,
* plus transparent,
* plus international,
* plus moderne,
* plus respectueux de la vie privée.

La promesse principale :

> GreeCheck transforme chaque scan en décision claire, personnalisée et utile.
