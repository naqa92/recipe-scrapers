# recipe-scrapers (TypeScript)

Lecteur de recettes de Stewy : port TypeScript de [hhursev/recipe-scrapers](https://github.com/hhursev/recipe-scrapers) (MIT, commit `3fd942b`), réduit aux sites portés (`scripts/sites.json`) et aux champs dont l'app a besoin. Sert l'import URL de Stewy (D32).

- **`src/`** : le lecteur. TypeScript pur, sans API Node (`npm run check:portable`) : il tourne sur l'iPhone, qui lit la page à l'import. Lecteur schema.org générique (JSON-LD + microdata, port d'extruct) + surcharges par site dans `src/sites/`, seulement là où le générique ne rend pas ce qu'attend upstream.

```ts
import { readRecipe } from "recipe-scrapers";

const r = await readRecipe(url, { headers: { "Accept-Language": "fr" } }); // ne lève jamais
if (r.complete) show(r.recipe); // titre, ingrédients (+ groupes), étapes (+ sections), durées, portions, photo, auteur, site
```

## Écarts voulus avec upstream

- Pas de `description` (jamais le texte d'introduction de l'auteur), ni avis, équipement, méthode de cuisson, régimes.
- `instructionGroups` : étapes regroupées par `HowToSection`, noms de section hors des étapes (upstream les mêle aux étapes).
- Lecture plus tolérante : un script JSON-LD invalide n'empêche plus de lire les suivants, un `@context` en liste est accepté, un `HowToStep` sans texte est sauté. Upstream abandonnait la page entière dans ces cas.
- `readRecipe` décode la page selon son charset (Shift_JIS, EUC-KR…), là où `Response.text()` force l'UTF-8.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run fixtures` | télécharge les fixtures upstream des sites portés dans `tests/fixtures/` (non versionnées) |
| `npm test` | tests unitaires + parité avec les fixtures upstream |
| `npx tsx scripts/parity.ts [--host a.com]` | rapport de parité, ou diff détaillé d'un site |
| `npm run registry` | régénère `src/sites/index.ts` après ajout d'un site ([docs/porting.md](docs/porting.md)) |

## Licence

MIT, voir [LICENSE](LICENSE). Le code et les fixtures de test dérivent de recipe-scrapers (© The recipe-scrapers contributors).
