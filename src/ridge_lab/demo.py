"""Deterministic train/validation-only payload for the illustrative browser demo."""

from __future__ import annotations

import numpy as np

from ridge_lab.datasets import make_dataset
from ridge_lab.features import fit_polynomial_scaler, make_A
from ridge_lab.metrics import mse
from ridge_lab.solvers import fit_ols, ridge


def build_demo(degree: int, lam: float) -> dict[str, object]:
    """Fit OLS and Ridge on one seeded synthetic draw; never return test observations."""
    if isinstance(degree, bool) or not isinstance(degree, int) or not 1 <= degree <= 15:
        raise ValueError("degree must be between 1 and 15")
    if isinstance(lam, bool) or not isinstance(lam, (int, float)) or not np.isfinite(lam) or lam < 0:
        raise ValueError("lambda must be finite and non-negative")

    dataset = make_dataset(seed=42, noise_std=0.2, n_train=24, n_val=24, n_test=120)
    train_design = make_A(dataset.train.x, degree)
    scaler = fit_polynomial_scaler(train_design)
    train_design = scaler.transform(train_design)
    validation_design = scaler.transform(make_A(dataset.validation.x, degree))
    grid_x = np.linspace(0.0, 1.0, 241)
    grid_design = scaler.transform(make_A(grid_x, degree))

    ols_coefficients = fit_ols(train_design, dataset.train.y)
    ridge_coefficients = ridge(train_design, dataset.train.y, lam)
    ols_train = train_design @ ols_coefficients
    ridge_train = train_design @ ridge_coefficients
    ols_validation = validation_design @ ols_coefficients
    ridge_validation = validation_design @ ridge_coefficients

    try:
        condition_number = float(np.linalg.cond(make_A(dataset.train.x, degree)))
        if not np.isfinite(condition_number):
            condition_number = None
    except np.linalg.LinAlgError:
        condition_number = None

    return {
        "illustrative": True,
        "seed": dataset.seed,
        "noise_std": dataset.noise_std,
        "degree": degree,
        "lambda": float(lam),
        "grid": {
            "x": grid_x.tolist(),
            "truth": np.sin(2.0 * np.pi * grid_x).tolist(),
            "ols": (grid_design @ ols_coefficients).tolist(),
            "ridge": (grid_design @ ridge_coefficients).tolist(),
        },
        "train": {"x": dataset.train.x.tolist(), "y": dataset.train.y.tolist()},
        "validation": {"x": dataset.validation.x.tolist(), "y": dataset.validation.y.tolist()},
        "predictions": {
            "train": {"ols": ols_train.tolist(), "ridge": ridge_train.tolist()},
            "validation": {"ols": ols_validation.tolist(), "ridge": ridge_validation.tolist()},
        },
        "metrics": {
            "ols": {
                "train_mse": mse(dataset.train.y, ols_train),
                "validation_mse": mse(dataset.validation.y, ols_validation),
            },
            "ridge": {
                "train_mse": mse(dataset.train.y, ridge_train),
                "validation_mse": mse(dataset.validation.y, ridge_validation),
            },
        },
        "coefficients": {
            "ols": ols_coefficients.tolist(),
            "ridge": ridge_coefficients.tolist(),
        },
        "condition_number_unscaled_train_design": condition_number,
    }
