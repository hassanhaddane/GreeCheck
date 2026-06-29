# GreeCheck

> Scanne. Comprends. Choisis mieux.

Plateforme nutritionnelle premium (web/PWA) — alternative moderne, intelligente et privacy-first à Yuka. Score propriétaire **GreeScore** calculé localement.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · next-intl (FR/EN/AR + RTL) · Zustand · Dexie (IndexedDB) · PWA.

## Principes
- **Privacy-first** : aucun compte, aucune base utilisateur. Préférences, historique, favoris et panier restent sur l'appareil (localStorage / IndexedDB).
- **Mobile-first** : bottom nav avec scan central, sidebar desktop.
- **Premium** : blanc Apple Health + vert naturel + vert néon, glassmorphism léger, micro-animations.
- **Source de données** : Open Food Facts (Ciqual/ANSES et USDA en enrichissement).

## Démarrage
```bash
npm install
npm run dev      # http://localhost:3000 → /fr
npm run build
npm run typecheck
```

## Structure
```
src/
  app/[locale]/        # home, scan, search, product/[barcode], battle, basket, map, settings, privacy
  components/          # ui, layout, score, radar, product, scan
  stores/             # zustand (preferences, history, favorites, basket) — persistés localement
  lib/constants/      # score, goals, filters, navigation
  i18n/               # routing + request (next-intl)
  types/              # product, scoring, user-preferences
messages/             # fr.json, en.json, ar.json
public/               # manifest.webmanifest, sw.js, icons
```

## Internationalisation
3 langues via `next-intl`. L'arabe est rendu en **RTL** (`dir="rtl"`) automatiquement. URLs préfixées : `/fr`, `/en`, `/ar`.

## V1 — exclus
Pas d'IA, pas de compte/auth, pas de backend utilisateur, pas de réseau social.

## Données
Données produits © Open Food Facts, sous licence ODbL.
