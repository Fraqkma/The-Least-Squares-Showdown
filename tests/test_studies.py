import numpy as np

from ridge_lab.bike_experiment import BikeFittedModel
from ridge_lab.official import score_models
from ridge_lab.studies import loss_surface, solver_study


def test_fixture_scoring():
    w = np.zeros(48)
    w[0] = 2
    result = score_models((BikeFittedModel("OLS", 0, w),), np.array([0, 1]),
                          np.array([0, 1]), np.array([1., 3.]))
    assert result[0]["rmse"] == 1
    assert result[0]["mae"] == 1


def test_surface_objective_and_axes():
    d = loss_surface(2)
    x = np.linspace(-1, 1, 30)
    y = 1 + 2*x + 0.1*np.sin(7*x)
    expected = np.sum((y-d["x"][4]-d["y"][9]*x)**2)+2*d["y"][9]**2
    assert np.isclose(d["z"][9][4], expected)
    for name in ("ols", "ridge"):
        intercept, slope = d[name]
        marker_height = np.sum((y - intercept - slope * x) ** 2) + 2 * slope**2
        assert np.isclose(d["marker_objective"][name], marker_height)
    zero = loss_surface(0)
    np.testing.assert_allclose(zero["ols"], zero["ridge"], atol=1e-10)
    assert np.isclose(zero["marker_objective"]["ols"], zero["marker_objective"]["ridge"])


def test_solver_benchmark_shared_cases():
    rows = solver_study()["rows"]
    assert len(rows) == 16
    assert all(r["seconds"] >= 0 for r in rows)
    assert {r["method"] for r in rows} == {"Normal Equations", "QR", "SVD", "Batch Gradient Descent"}


def test_lasso_active_set_matches_stricter_reference_on_predictions():
    from ridge_lab.datasets import make_dataset
    from ridge_lab.features import fit_polynomial_scaler, make_A
    from ridge_lab.metrics import mse
    from ridge_lab.solvers import lasso

    for degree, alpha in ((4, 0.01), (8, 0.001), (15, 0.001)):
        data = make_dataset(seed=42, noise_std=0.2)
        scaler = fit_polynomial_scaler(make_A(data.train.x, degree))
        train = scaler.transform(make_A(data.train.x, degree))
        validation = scaler.transform(make_A(data.validation.x, degree))
        normal_info = {}
        strict_info = {}
        normal = lasso(train, data.train.y, alpha, max_iter=50_000,
                       diagnostics=normal_info)
        strict = lasso(train, data.train.y, alpha, max_iter=100_000,
                       tol=1e-10, diagnostics=strict_info)
        assert normal_info["converged"] and strict_info["converged"]
        assert normal_info["kkt_residual"] <= 1e-8
        assert strict_info["kkt_residual"] <= 1e-10
        np.testing.assert_allclose(validation @ normal, validation @ strict,
                                   atol=1e-5, rtol=1e-5)
        assert abs(mse(data.validation.y, validation @ normal)
                   - mse(data.validation.y, validation @ strict)) < 1e-6
