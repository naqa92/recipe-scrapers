# S9r information column: recipe-scrapers 15.12 (Python) on the same HTML as the TS run, read like s9.py.
# Usage: uv run --with recipe-scrapers==15.12 python bench/s9r_py.py
import gzip, json, pathlib, sys
from recipe_scrapers import scrape_html
from recipe_scrapers._schemaorg import SchemaOrg

OUT = pathlib.Path(__file__).parent / "runs" / (sys.argv[1] if len(sys.argv) > 1 else "S9R")
res = {}
for d in json.loads((OUT / "draws.json").read_text()):
    if not d.get("htmlFile"):
        continue
    html = gzip.decompress((OUT / "html" / f"{d['htmlFile']}.html.gz").read_bytes()).decode("utf-8")
    row = {}
    try:
        s = SchemaOrg(html)
        row = {"title": s.title(), "ingredients": s.ingredients(), "steps": [x for x in s.instructions().split("\n") if x.strip()]}
    except Exception as e:
        row = {"jsonld_error": type(e).__name__}
    if not (row.get("title") and row.get("ingredients") and row.get("steps")):
        try:
            sc = scrape_html(html, org_url=d["url"], supported_only=False)
            row = {"title": sc.title(), "ingredients": sc.ingredients(), "steps": sc.instructions_list()}
        except Exception as e:
            row["scrapers_error"] = f"{type(e).__name__}: {str(e)[:120]}"
    res[d["url"]] = row
(OUT / "python.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
print(len(res), "pages")
