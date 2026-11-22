"""FastAPI adapter for the framework-independent ridge_lab package."""

import json
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from ridge_lab.bike_experiment import bike_development_payload
from ridge_lab.demo import build_demo

app = FastAPI(title="When Perfect Fit Fails", docs_url=None, redoc_url=None)
frontend = Path(__file__).resolve().parents[1] / "frontend"


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/demo")
def demo(
    degree: Annotated[int, Query(ge=1, le=15)] = 9,
    lam: Annotated[float, Query(alias="lambda", ge=0, le=1000)] = 0.1,
) -> dict[str, object]:
    return build_demo(degree, lam)


@app.get("/api/bike/development")
def bike_development() -> dict:
    return bike_development_payload()


@app.get("/api/bike/official")
def bike_official() -> dict:
    """Serve the approved scoring artifact without rerunning the holdout."""
    record = Path(__file__).resolve().parents[1] / "results" / "bike-official.json"
    data = json.loads(record.read_text(encoding="utf-8"))
    if (data.get("scope") != "official holdout" or data.get("approved_by") != "Nipitpon"
            or {row.get("method") for row in data.get("results", [])}
            != {"OLS", "Ridge", "Lasso"}):
        raise ValueError("the approved Bike Sharing result artifact is invalid")
    return data


@app.get("/api/study/saved/{name}")
def saved_study(name: str) -> dict:
    """Read a reproducible development snapshot for immediate presentation."""
    if name not in {"synthetic", "solvers"}:
        raise HTTPException(status_code=404, detail="Unknown saved study.")
    path = Path(__file__).resolve().parents[1] / "results" / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Saved study artifact not found.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("rows"), list):
        raise HTTPException(status_code=500, detail="Saved study artifact has no results.")
    return data


@app.get("/api/study/{name}")
def study(name: str, lam: float = 1.0) -> dict:
    from ridge_lab.studies import loss_surface, solver_study, synthetic_study

    if name == "synthetic":
        return synthetic_study()
    if name == "solvers":
        return solver_study()
    if name == "surface":
        if not 0 <= lam <= 1000:
            raise HTTPException(status_code=422, detail="Penalty lambda must be between 0 and 1000.")
        return loss_surface(lam)
    raise HTTPException(status_code=404, detail="Unknown study.")


app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")
