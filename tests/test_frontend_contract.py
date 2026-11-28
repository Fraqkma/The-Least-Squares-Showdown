"""Static checks that keep the presentation markup and its scripts in step."""

import re
from html.parser import HTMLParser
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
CHAPTERS = ["overview", "least-squares", "overfitting", "results", "battle-b"]
# Created by walkthrough.js when a step renders, so they are not in the static page.
RENDERED_IDS = {"walk-predictions", "walk-residual-note"}


class _Collector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.chapters: list[str] = []
        self.assets: list[str] = []
        self.hidden_ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids.add(element_id)
            if "hidden" in values:
                self.hidden_ids.add(element_id)
        if tag == "section" and "chapter" in (values.get("class") or "").split():
            self.chapters.append(element_id or "")
        for name in ("src", "href"):
            target = values.get(name) or ""
            if target.startswith("/") and not target.startswith("/api/"):
                self.assets.append(target)


def _page() -> _Collector:
    collector = _Collector()
    collector.feed((FRONTEND / "index.html").read_text(encoding="utf-8"))
    return collector


def _scripts() -> dict[Path, str]:
    return {path: path.read_text(encoding="utf-8") for path in FRONTEND.joinpath("js").rglob("*.js")}


def test_five_chapters_in_presentation_order() -> None:
    assert _page().chapters == CHAPTERS


def test_every_id_used_by_the_scripts_exists_in_the_page() -> None:
    page_ids = _page().ids
    pattern = re.compile(r"""(?:getElementById|byId)\(\s*["']([\w-]+)["']|["']#([a-z][\w-]*)["'\s,]""")
    missing = set()
    for path, source in _scripts().items():
        for match in pattern.finditer(source):
            element_id = match.group(1) or match.group(2)
            if match.group(2) and re.fullmatch(r"[0-9a-f]{3,8}", element_id):
                continue  # a colour such as "#ffffff", not an element id
            if element_id not in page_ids | RENDERED_IDS:
                missing.add(f"{path.name}: {element_id}")
    assert not missing, sorted(missing)


def test_page_assets_are_bundled_locally() -> None:
    for asset in _page().assets:
        assert (FRONTEND / asset.lstrip("/")).is_file(), asset
    css = "".join(path.read_text(encoding="utf-8") for path in FRONTEND.joinpath("css").glob("*.css"))
    for font in re.findall(r'url\("(/vendor/fonts/[^"]+)"\)', css):
        assert (FRONTEND / font.lstrip("/")).is_file(), font


def test_presentation_opens_with_controls_collapsed() -> None:
    assert "lab-panel" in _page().hidden_ids


def test_run_all_never_requests_the_official_holdout() -> None:
    studies = (FRONTEND / "js" / "studies.js").read_text(encoding="utf-8")
    start = studies.index('byId("run-all").addEventListener')
    end = studies.index("async function loadSavedStudies")
    assert "/api/bike/official" not in studies[start:end]
    official_calls = sum(source.count("/api/bike/official") for source in _scripts().values())
    assert official_calls == 1
