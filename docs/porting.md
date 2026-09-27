# Porter un site depuis recipe-scrapers

Un site n'a un fichier dans `src/sites/` que si le lecteur générique (schema.org) ne rend pas ce qu'attendent les fixtures upstream (commit `3fd942b`). Référence de style : [src/sites/archanaskitchen.com.ts](../src/sites/archanaskitchen.com.ts).

## Fichier

`src/sites/<host>.ts` :

```ts
import { Scraper } from "../scraper.ts";

export const hosts = ["example.com"]; // toutes les clés SCRAPERS servies par cette classe upstream

export default class extends Scraper {
  override ingredients(): string[] { ... }
}
```

Puis `npm run registry` (régénère `src/sites/index.ts`) et `npx tsx scripts/parity.ts --host example.com` (✓ par fixture, sinon diff attendu / obtenu).

## Champs portés (les autres sont ignorés)

`title`, `author`, `siteName`, `language`, `image`, `yields`, `totalTime`, `prepTime`, `cookTime`, `ingredients`, `ingredientGroups`, `instructions`, `category`, `cuisine`, `keywords`, `nutrients`, `canonicalUrl`. Ne pas porter `description`, `ratings`, `ratings_count`, `equipment`, `cooking_method`, `dietary_restrictions`.

## Équivalences Python → TS

| Python (upstream) | TS |
|---|---|
| méthode non définie (schema fill) | ne rien surcharger : la classe de base lit schema.org |
| `self.schema.title()` etc. | `this.schema.title()` etc. |
| `self.soup.find("h1")` / `select_one(css)` | `this.$("h1").first()` / `selectOne(this.$, css)` de `../helpers.ts` |
| `find_all` / `select` | `this.$(css).toArray()` ou `.map(...)` |
| `tag.get_text()` / `get_text(" ", strip=True)` | `getText(el)` / `getText(el, " ", true)` de `../helpers.ts` (exclut script/style/template comme bs4) |
| `tag["href"]` / `tag.get("content")` | `this.$(el).attr("href")` |
| `normalize_string`, `get_minutes`, `get_yields`, `get_equipment` | `normalizeString`, `getMinutes`, `getYields`, `getEquipment` de `../utils.ts` |
| `group_ingredients(self.ingredients(), self.soup, h, e)` | `this.groupBy(h, e)` |
| `self.opengraph.site_name()` / `.image()` | lire `meta[property="og:site_name"]` / `meta[property="og:image"]` |
| `raise ElementNotFoundInHtml` / `SchemaOrgException` | `throw new FieldMissing("...")` (`../schemaorg.ts`) |
| `FieldNotProvidedByWebsiteException(return_value=X)` / `StaticValueException(return_value=X)` | `return X` |
| `instructions()` renvoie un str joint par `"\n"` | idem : `instructions(): string` |
| `_schema_cls = CustomSchemaOrg` (sous-classe de SchemaOrg) | surcharger les champs concernés en lisant `this.schema.data` |
| mixin `WPRMMixin` | ignorer (equipment seulement) |

La chaîne de plugins est appliquée par la classe de base, ne pas la refaire : titre normalisé et nettoyé des balises ; ingrédients et étapes nettoyés des balises ; image choisie par `bestImage` avec repli og:image ; `siteName` repli og:site_name sur `FieldMissing`.

## Règles

- Traduire fidèlement la classe upstream (`recipe_scrapers/<module>.py` au commit `3fd942b`), méthode par méthode, pour les seuls champs portés qui divergent. Ne pas inventer de sélecteur absent d'upstream.
- Ne modifier que des fichiers `src/sites/*.ts`. Un écart qui semble venir du cœur (`src/*.ts`) se signale, il ne se corrige pas dans un site.
- Un écart qu'upstream lui-même ne tient pas (le test Python échoue aussi) se signale et se laisse.
