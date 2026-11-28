import json
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

from api.main import app
from ridge_lab.demo import build_demo

client = TestClient(app)


def test_demo_is_deterministic_and_does_not_return_held_out_targets() -> None:
    first = build_demo(degree=5, lam=0.25)
    second = build_demo(degree=5, lam=0.25)

    assert first == second
    assert first["illustrative"] is True
    assert "test" not in first


def test_api_serves_site_and_validated_train_validation_demo() -> None:
    page = client.get("/")
    demo = client.get("/api/demo", params={"degree": 4, "lambda": 0})

    assert page.status_code == 200
    assert "The Least Squares Showdown" in page.text
    assert client.get("/api/health").json() == {"status": "ok"}
    assert demo.status_code == 200
    payload = demo.json()
    assert payload["degree"] == 4
    assert payload["lambda"] == 0
    assert "test" not in payload
    assert set(payload["metrics"]) == {"ols", "ridge"}


def test_api_rejects_out_of_range_controls() -> None:
    assert client.get("/api/demo", params={"degree": 16}).status_code == 422
    assert client.get("/api/demo", params={"lambda": -1}).status_code == 422
    assert client.get("/api/demo", params={"lambda": 1001}).status_code == 422


def test_point_inspector_predictions_match_the_reported_mse() -> None:
    demo = build_demo(degree=12, lam=0.1)
    for split in ("train", "validation"):
        observed = np.asarray(demo[split]["y"])
        for method in ("ols", "ridge"):
            predicted = np.asarray(demo["predictions"][split][method])
            assert observed.shape == predicted.shape
            np.testing.assert_allclose(
                np.mean((observed - predicted) ** 2), demo["metrics"][method][f"{split}_mse"]
            )


def test_official_bike_route_serves_recorded_artifact_without_scoring(monkeypatch) -> None:
    from ridge_lab import official

    monkeypatch.setattr(official, "score_models", lambda *_: (_ for _ in ()).throw(
        AssertionError("site must not score the holdout")
    ))
    recorded = json.loads((Path(__file__).resolve().parents[1] / "results" /
                           "bike-official.json").read_text(encoding="utf-8"))
    response = client.get("/api/bike/official")
    assert response.status_code == 200
    assert response.json() == recorded
    assert [row["method"] for row in recorded["results"]] == ["OLS", "Ridge", "Lasso"]


def test_saved_studies_expose_all_comparison_methods() -> None:
    synthetic = client.get("/api/study/saved/synthetic")
    solvers = client.get("/api/study/saved/solvers")
    assert synthetic.status_code == solvers.status_code == 200
    assert {row["method"] for row in synthetic.json()["rows"]} == {"OLS", "Ridge", "Lasso"}
    assert {row["method"] for row in solvers.json()["rows"]} == {
        "Normal Equations", "QR", "SVD", "Batch Gradient Descent",
    }
    assert len(synthetic.json()["failures"]) == 0


def test_study_routes_reject_unknown_names_and_invalid_penalties() -> None:
    assert client.get("/api/study/saved/unknown").status_code == 404
    assert client.get("/api/study/unknown").status_code == 404
    assert client.get("/api/study/surface", params={"lam": -1}).status_code == 422
    assert client.get("/api/study/surface", params={"lam": 1001}).status_code == 422
    zero = client.get("/api/study/surface", params={"lam": 0})
    pos = client.get("/api/study/surface", params={"lam": 5})
    assert zero.status_code == pos.status_code == 200
    assert zero.json()["marker_objective"]["ols"] == zero.json()["marker_objective"]["ridge"]
    assert pos.json()["marker_objective"]["ridge"] < pos.json()["marker_objective"]["ols"]
