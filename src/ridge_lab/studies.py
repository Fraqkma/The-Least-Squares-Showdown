"""Bounded development studies; no official holdout scoring."""

import time

import numpy as np

from ridge_lab.datasets import make_dataset
from ridge_lab.features import fit_polynomial_scaler, make_A
from ridge_lab.metrics import mse
from ridge_lab.solvers import fit_ols, lasso, ridge


def synthetic_study():
    rows = []
    failures = []
    fixed_degree = []
    sweeps = []
    for noise in (0.1, 0.2, 0.4):
        for seed in range(42, 52):
            data = make_dataset(seed=seed, noise_std=noise)
            candidates = []
            for degree in range(1, 16):
                raw = make_A(data.train.x, degree)
                scaler = fit_polynomial_scaler(raw)
                a = scaler.transform(raw)
                v = scaler.transform(make_A(data.validation.x, degree))
                settings = (
                    [("OLS", 0)]
                    + [("Ridge", float(p)) for p in [0, *np.logspace(-8, 3, 12)]]
                    + [("Lasso", p) for p in (0.001, 0.01, 0.1, 1)]
                )
                for method, penalty in settings:
                    info = {}
                    try:
                        w = (
                            fit_ols(a, data.train.y)
                            if method == "OLS"
                            else ridge(a, data.train.y, penalty)
                            if method == "Ridge"
                            else lasso(a, data.train.y, penalty, max_iter=50_000, diagnostics=info)
                        )
                        candidates.append(
                            {
                                "method": method,
                                "degree": degree,
                                "penalty": penalty,
                                "train_mse": mse(data.train.y, a @ w),
                                "validation_mse": mse(data.validation.y, v @ w),
                                "condition": float(np.linalg.cond(a)),
                                "solver_diagnostics": info,
                            }
                        )
                    except RuntimeError:
                        failures.append(
                            {
                                "seed": seed,
                                "noise": noise,
                                "method": method,
                                "degree": degree,
                                "penalty": penalty,
                                "status": "iteration_limit",
                                "solver_diagnostics": info,
                            }
                        )
            sweeps.extend(dict(seed=seed, noise=noise, **c) for c in candidates)
            for method in ("OLS", "Ridge"):
                fixed = min(
                    (c for c in candidates if c["method"] == method and c["degree"] == 15),
                    key=lambda c: (c["validation_mse"], c["penalty"]),
                )
                fixed_degree.append(dict(seed=seed, noise=noise, **fixed))
            for method in ("OLS", "Ridge", "Lasso"):
                best = min(
                    (c for c in candidates if c["method"] == method),
                    key=lambda c: (c["validation_mse"], c["degree"], c["penalty"]),
                )
                rows.append(dict(seed=seed, noise=noise, **best))
    return {
        "scope": "validation selection only; synthetic test reserved",
        "rows": rows,
        "failures": failures,
        "fixed_degree_15": fixed_degree,
        "candidates": sweeps,
    }


def solver_study():
    rows = []
    rng = np.random.default_rng(42)
    for n, p in ((100, 8), (500, 16)):
        for condition in (10, 1e6):
            u = np.linalg.qr(rng.normal(size=(n, p)))[0]
            v = np.linalg.qr(rng.normal(size=(p, p)))[0]
            a = u @ np.diag(np.geomspace(1, 1 / condition, p)) @ v.T
            truth = rng.normal(size=p)
            y = a @ truth
            for method in ("Normal Equations", "QR", "SVD", "Batch Gradient Descent"):
                times = []
                status = "completed"
                iterations = 0
                try:
                    for repeat in range(3):
                        start = time.perf_counter()
                        if method == "Normal Equations":
                            w = np.linalg.solve(a.T @ a, a.T @ y)
                        elif method == "QR":
                            q, r = np.linalg.qr(a)
                            w = np.linalg.solve(r, q.T @ y)
                        elif method == "SVD":
                            w = fit_ols(a, y)
                        else:
                            w = np.zeros(p)
                            step = 1 / np.linalg.norm(a, 2) ** 2
                            for iterations in range(1, 10001):
                                gradient = a.T @ (a @ w - y)
                                if np.linalg.norm(gradient) <= 1e-8:
                                    break
                                w -= step * gradient
                            else:
                                status = "iteration_limit"
                        times.append(time.perf_counter() - start)
                    rows.append(
                        {
                            "method": method,
                            "n": n,
                            "p": p,
                            "condition": condition,
                            "seconds": float(np.median(times)),
                            "coefficient_relative_error": float(
                                np.linalg.norm(w - truth) / np.linalg.norm(truth)
                            ),
                            "residual": float(np.linalg.norm(a @ w - y)),
                            "input_bytes": a.nbytes + y.nbytes,
                            "iterations": iterations,
                            "status": status,
                        }
                    )
                except np.linalg.LinAlgError as exc:
                    rows.append(
                        {
                            "method": method,
                            "n": n,
                            "p": p,
                            "condition": condition,
                            "status": str(exc),
                        }
                    )
    return {
        "scope": "synthetic solver benchmark",
        "memory": "input array bytes only; peak workspace not measured",
        "rows": rows,
    }


def loss_surface(lam=1.0):
    x = np.linspace(-1, 1, 30)
    a = np.column_stack((np.ones(30), x))
    y = 1 + 2 * x + 0.1 * np.sin(7 * x)
    axis = np.linspace(-1, 4, 41)
    z = [[float(np.sum((y - b0 - b1 * x) ** 2) + lam * b1 * b1) for b0 in axis] for b1 in axis]
    ols_coefficients = fit_ols(a, y)
    ridge_coefficients = ridge(a, y, lam)
    def objective(coefficients):
        return float(np.sum((y - a @ coefficients) ** 2) + lam * coefficients[1] ** 2)

    return {
        "x": axis.tolist(),
        "y": axis.tolist(),
        "z": z,
        "ols": ols_coefficients.tolist(),
        "ridge": ridge_coefficients.tolist(),
        "marker_objective": {"ols": objective(ols_coefficients), "ridge": objective(ridge_coefficients)},
        "objective": "SSE + lambda * slope^2; intercept unpenalized",
        "penalty": lam,
    }
