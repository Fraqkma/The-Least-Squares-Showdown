# The Least Squares Showdown

An interactive linear algebra lesson on least squares, polynomial overfitting, Ridge Regression, and a real-world hourly bike-rental case study. The browser interface is vanilla HTML, CSS, and JavaScript; a thin FastAPI service calls the framework-independent `ridge_lab` package.

The interactive synthetic fit is an **illustrative seeded demo**, not a report of final experiments. It fits coefficients on training data and displays train and validation metrics. Test observations and test scores are not returned to the browser.

Battle A uses the bundled UCI Capital Bike Sharing `hour.csv` file to predict `cnt` (rentals per hour) from hour of day, working-day status, and their interaction. The results section shows a clearly labeled **development-only** OLS/Ridge/Lasso smoke comparison and adjustable tier weights for an exploratory ordering. The fixed primary rank remains RMSE; the approved future-date holdout was scored once on 2026-11-20. See [the source and split contract](docs/bike_split_contract.md) and [the historical dataset audit](docs/datasets_review.md).

## Run locally

Python 3.13 is recommended; Python 3.11 or newer is supported.

Windows PowerShell:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn api.main:app --reload
```

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn api.main:app --reload
```

Open `http://127.0.0.1:8000`. Plotly.js (`frontend/vendor/plotly.min.js`), the UCI Bike Sharing CSV (`data/bike/hour.csv`), and saved development and official artifacts (`results/*.json`) are bundled locally, so the site runs offline with saved results ready on first load.

## Verify

```bash
python -m pytest
python -m ruff check .
```

## Project structure

- `frontend/` contains the responsive single-page lesson, design tokens, ES modules, and local Plotly.js build.
- `api/` serves the static site and validates the demo API parameters.
- `src/ridge_lab/` contains deterministic data, polynomial features, train-only scaling, stable OLS/Ridge solvers, and metrics. It does not import FastAPI or frontend code.
- `docs/decisions.md` records the architectural migration and pending method-owner sign-off; `task.md` remains the project roadmap.

The original group README is preserved at [`docs/original-group-readme.md`](docs/original-group-readme.md). The project uses a deterministic synthetic signal, `sin(2πx) + Gaussian noise`; validation is for comparison, and final test evaluation stays reserved until model choices are frozen.

Plotly.js is distributed under the MIT license; its license is included in `frontend/vendor/plotly-LICENSE.txt`. Design guidance was adapted from Unslop by Damir Sokolovsky under CC BY 4.0.

## Consolidated review commands

```powershell
.\.venv\Scripts\python.exe -m ridge_lab.reproduce
.\.venv\Scripts\python.exe -m uvicorn api.main:app --port 8011
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
git diff --check
```

Open `http://127.0.0.1:8011`. Saved development studies and the approved official Bike Sharing table load automatically on first visit; click **Run All comparisons** only when you want to recompute development studies live (the full ten-seed synthetic sweep takes roughly 40–60 seconds). The following official Bike Sharing command was run once after Nipitpon approved the verified snapshot. It must not be rerun for model selection:

```powershell
.\.venv\Scripts\python.exe -m ridge_lab.official --approved-by Nipitpon --output results/bike-official.json
```

The output is `results/bike-official.json`; it uses exclusive creation to prevent overwriting the one-time official record. See `report/draft.md` and the final review section in `BATTLE_A_PROTOCOL_REVIEW.md` for limitations.

## Synthetic convergence and report export

The ten-seed synthetic sweep now records every Lasso iteration count and KKT residual in `results/synthetic.json`. The 365 baseline limit hits and the final zero-hit run are compared in `results/lasso-convergence-audit.json`. Recreate the saved results and audit with:

```powershell
.\.venv\Scripts\python.exe -m ridge_lab.reproduce
.\.venv\Scripts\python.exe scripts/audit_lasso.py
.\.venv\Scripts\python.exe scripts/export_report.py
```

`report/print.html` is the print-ready A4 export source. The current `report/draft.pdf` was printed from it with a local headless browser and is a review draft; it includes the separately labeled official Bike Sharing holdout results. See `BATTLE_A_PROTOCOL_REVIEW.md` for the numerical method and verification scope.

## Presentation site

The single-page dark site has a featured Least Squares 3D loss surface, Battle A tabs for synthetic validation and Bike Sharing, and a separate Battle B solver table. Run All computes development and benchmark results; the official Bike Sharing table loads only the existing `results/bike-official.json` artifact. Its historical one-time score is never recomputed by the site. The final run and viewport checks are recorded in the storyboard.
