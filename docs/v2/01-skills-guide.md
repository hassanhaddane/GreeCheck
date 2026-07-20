# GreeCheck V2 — Guide des skills projet

> Emplacement : `.claude/skills/<nom>/SKILL.md` (convention project-local de
> Claude Code / Cowork — chargée automatiquement quand ce dossier est le
> répertoire de travail). Créé le 2026-07-20 sur `develop` (`b7b57df`).

Six skills protègent les invariants du projet. Ils ne remplacent pas les
instructions projet ; ils les rendent applicables tâche par tâche. **Plusieurs
skills s'appliquent souvent à la même tâche** — les invoquer tous.

## Quand invoquer chaque skill

| Skill | Invocation obligatoire quand… |
|---|---|
| `greecheck-product-guardian` | Toute tâche qui ajoute/supprime/renomme/réordonne une fonctionnalité, route, entrée de navigation ou concept utilisateur ; toute demande impliquant comptes, données serveur, pubs, tracking ou IA. **À consulter en premier sur toute tâche de périmètre.** |
| `greecheck-brand-system` | Toute tâche UI : composant, page, style, animation, icône, thème, Tailwind/CSS — même si la demande ne parle pas de design. |
| `greecheck-scoring-integrity` | Tout contact avec `src/domains/scoring/` ou avec les consommateurs du score (VerdictCard, TrustHalo, GreeDNA, GreeSwap, Battle, GreeCart) ; toute demande « ajuster le score », « pénaliser », « pourquoi ce produit a X ». |
| `greecheck-mobile-ux` | Toute tâche créant/modifiant une page, layout, navigation, overlay, sheet, flux caméra/scan ou élément interactif — y compris le travail « desktop ». |
| `greecheck-data-quality` | Tout contact avec `src/services/api/`, `src/domains/product/`, le cache produit, les états offline/stale, ou l'affichage d'ingrédients, nutriments, additifs, halal/vegan, Green-Score, Trust Halo. |
| `greecheck-release-auditor` | Fin de toute tâche d'implémentation, avant tout merge vers `main` ou déploiement Vercel, et sur toute demande « vérifier / auditer / c'est prêt ? ». **Aucune tâche n'est terminée sans son passage.** |

## Combinaisons typiques

- **Nouvelle page ou refonte d'écran** → product-guardian + brand-system +
  mobile-ux, puis release-auditor en sortie.
- **Modification du moteur de score ou du registre d'additifs** →
  scoring-integrity + data-quality (les données alimentent le score), puis
  release-auditor.
- **Nouvelle source de données ou changement du normalizer** → data-quality +
  scoring-integrity, puis release-auditor.
- **Changement de navigation ou du flux de scan** → product-guardian +
  mobile-ux + brand-system, puis release-auditor.
- **« Petite retouche CSS »** → brand-system au minimum (c'est précisément là
  que les hex codes en dur apparaissent).

## Règles d'usage

1. Lire le(s) SKILL.md pertinent(s) **avant** de modifier le code, pas après.
2. En cas de conflit entre une demande et un skill, signaler le conflit et
   proposer l'alternative conforme (les skills encodent des invariants produit,
   pas des préférences).
3. Les critères d'acceptation de chaque skill sont des cases à cocher réelles :
   les vérifier, pas les supposer.
4. Toute évolution volontaire d'un invariant (ex. changement de formule
   GreeScore) doit mettre à jour le skill concerné dans le même commit.
