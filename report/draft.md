# The Least Squares Showdown — Project Report

**Question:** Can we predict how many bikes will be rented in a given hour?

## 1. Mathematical foundation

Given a design matrix `A`, coefficient vector `β`, and observation vector `y`, ordinary least squares (OLS) minimizes the sum of squared errors (SSE), `‖y − Aβ‖₂²`. At a minimizer, the residual `y − Aβ` is orthogonal to every column of `A`, producing the normal equations `AᵀAβ = Aᵀy`. Forming `AᵀA` explicitly squares the matrix condition number, so numerical implementations prefer QR factorization (QR) or singular value decomposition (SVD) instead of explicit matrix inversion.

Regularized models add a penalty to control coefficient size while leaving the intercept unpenalized:

- **Ridge Regression** minimizes `‖y − Aβ‖₂² + λ‖β_nonintercept‖₂²`, where `λ ≥ 0` is on the sum-SSE scale. At `λ = 0`, Ridge reduces exactly to OLS on the same features.
- **Lasso Regression** minimizes `(1 / (2n))‖y − Aβ‖₂² + α‖β_nonintercept‖₁`, where `α > 0` sits on the average-half-SSE scale. Because the residual terms differ by a factor of `2n`, numerical values of `λ` and `α` are not directly interchangeable.

## 2. Battle A: Bike Sharing development results

Dataset: UCI Capital Bike Sharing `hour.csv` (Fanaee-T, 2013, DOI 10.24432/C5W894, CC BY 4.0; verified SHA-256 `e03de4ee4ef4dc376ac6e04bf829673c6269e8eba5c60fa121640fa2f829504f`). The target is `cnt`, total bike rentals per hour. All three models share the same fixed 48-column design matrix: 1 intercept, 23 hour indicators (`hr` 1–23 with hour 0 as reference), 1 `workingday` indicator, and 23 hour-by-working-day interaction columns. Rental component columns (`casual` and `registered`) sum identically to `cnt` and are excluded, along with weather, IDs, and all other raw fields.

Development uses 13,915 rows spanning 2011-01-01 through 2012-08-07 (585 dates), divided into five chronological expanding windows where all hours of each date stay together and every training date precedes its validation dates. Settings are selected within each method by the unweighted mean of the five validation-window root mean squared error (RMSE) values (in rentals per hour; lower is better), breaking exact ties by smaller penalty. Mean absolute error (MAE, rentals per hour; lower is better), coefficient of determination (R²; higher is better), and population standard deviation (SD) of RMSE across the five windows are reported alongside RMSE (`results/bike.json`).

| Model | Selected setting | Mean RMSE (rentals/hr) | Mean MAE (rentals/hr) | Mean R² | Window RMSE SD |
|---|---|---:|---:|---:|---:|
| OLS | none | 117.460 | 83.835 | 0.47144 | 36.719 |
| Ridge | λ = 0 | 117.460 | 83.835 | 0.47144 | 36.719 |
| Lasso | α = 0.001 | 117.474 | 83.838 | 0.47132 | 36.728 |

OLS and Ridge tie on development validation because the Ridge grid `{0, 1, 10, 100}` selects `λ = 0`. This reflects a well-conditioned, full-rank 48-column basis on thousands of observations rather than evidence that regularization never helps. Window-to-window RMSE variation (`36.7` rentals/hour) is large relative to the `0.014` rentals/hour difference between OLS/Ridge and Lasso, and the five chronological windows are temporally dependent. The normal data loader masks reserved holdout targets as `NaN`; final refit trains each selected setting once on all 13,915 development rows.

## 3. Official Battle A Bike Sharing holdout

Before official evaluation, Nipitpon approved the frozen pre-scoring snapshot (all 61 files in `results/review-manifest.json` matched SHA-256 exactly). The separate later-date official holdout spans 2012-08-08 through 2012-12-31 (146 dates, 3,464 rows). Using the fixed 48-column design and development-selected penalties refit once on all 13,915 development rows, the one-time official scorer produced `results/bike-official.json`:

| Model | Frozen setting | Official RMSE (rentals/hr) | Official MAE (rentals/hr) | Official R² |
|---|---|---:|---:|---:|
| OLS | none | 144.516 | 101.182 | 0.56949 |
| Ridge | λ = 0 | 144.516 | 101.182 | 0.56949 |
| Lasso | α = 0.001 | 144.531 | 101.188 | 0.56940 |

Ridge ties OLS identically on the official holdout because its frozen penalty is `λ = 0`, producing the exact same refitted coefficients. Lasso differs by `0.015` rentals/hour in RMSE (`144.531` vs `144.516`). Higher holdout RMSE than development mean RMSE reflects seasonal and later-year demand growth in late 2012. This single later-date block from one city does not establish a universal winner across other cities, years, or feature sets. No model choice was changed after viewing official scores.

## 4. Synthetic sensitivity study

To study polynomial overfitting and regularization separately from the fixed Bike Sharing basis, the synthetic benchmark draws `y = sin(2πx) + ε` on `[0, 1]` across ten random seeds (`42–51`) and three Gaussian noise standard deviations (`0.1`, `0.2`, `0.4`), using one train/validation split per seed and noise level (`24` train, `24` validation, `120` reserved test observations; 30 validation splits total). Polynomial degrees `1–15` are standardized using training-set statistics only. Ridge searches `λ = 0` plus twelve log-spaced values from `10⁻⁸` to `10³`; Lasso searches `α ∈ {0.001, 0.01, 0.1, 1}`. Selection chooses the lowest unrounded validation mean squared error (MSE), breaking ties by lower degree and smaller penalty (`results/synthetic.json`).

| Noise SD | OLS mean validation MSE | Ridge mean validation MSE | Lasso mean validation MSE | Lasso failures |
|---:|---:|---:|---:|---:|
| 0.1 | 0.011672 | 0.010059 | 0.014724 | 0 |
| 0.2 | 0.042793 | 0.039585 | 0.044113 | 0 |
| 0.4 | 0.165028 | 0.157390 | 0.165766 | 0 |

In the initial 10,000-sweep baseline, 365 of 1,800 Lasso fits (`20.28%`) hit the iteration limit and raised `RuntimeError`. Upgrading cyclic coordinate descent to maintain incremental residual gradients with an active-set Karush–Kuhn–Tucker (KKT) check and sign-boundary step under a 50,000-sweep budget reduced Lasso convergence failures to **0 of 1,800** (`results/lasso-convergence-audit.json`). Final Lasso fits converged in `1` to `30,500` iterations with maximum KKT residual `9.61e-9`, matching a stricter `1e-10` reference on validation predictions. Resolving those 365 failures changed 21 of 30 Lasso-selected degrees while keeping every selected `α = 0.001` and preserving the aggregate mean validation ordering (Ridge lowest, then OLS, then Lasso at every noise level). Because these are selected validation MSE values, they are optimistic compared with unseen test performance; the synthetic test split remains reserved under the provisional configuration.

## 5. Battle B: numerical solver benchmark

Battle B compares four least-squares solvers—Normal Equations, QR, SVD, and Batch Gradient Descent (GD)—on identical synthetic matrices `A` and noiseless targets `y = Aβ` (seed `42`) across shapes `100×8` and `500×16` and prescribed condition numbers `10` and `10⁶` (`results/solvers.json`). Runtime is the median of three `perf_counter` repetitions on one machine without warmup isolation and is descriptive rather than a universal speed ranking. GD minimizes half-SSE starting at zero with step size `1 / ‖A‖₂²`, gradient-norm tolerance `10⁻⁸`, and a 10,000-iteration cap (timing includes step-size calculation). Input memory measures the input arrays (`A` and `y`) only (`7,200` bytes for `100×8`; `68,000` bytes for `500×16`); peak solver workspace requires a separate measurement.

| Shape | Cond. | Solver | Median (s) | Rel. coeff. error | Residual norm | Input bytes | Iter. | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| 100×8 | 10 | Normal Equations | 0.000014 | 4.807e-15 | 1.083e-15 | 7,200 | Direct | completed |
| 100×8 | 10 | QR | 0.000039 | 3.545e-16 | 1.829e-16 | 7,200 | Direct | completed |
| 100×8 | 10 | SVD | 0.000032 | 7.535e-16 | 7.609e-16 | 7,200 | Direct | completed |
| 100×8 | 10 | Batch Gradient Descent | 0.006624 | 4.629e-07 | 9.903e-08 | 7,200 | 1,435 | completed |
| 100×8 | 10⁶ | Normal Equations | 0.000009 | 1.450e-05 | 3.810e-11 | 7,200 | Direct | completed |
| 100×8 | 10⁶ | QR | 0.000026 | 3.024e-12 | 1.551e-16 | 7,200 | Direct | completed |
| 100×8 | 10⁶ | SVD | 0.000037 | 1.164e-12 | 8.342e-16 | 7,200 | Direct | completed |
| 100×8 | 10⁶ | Batch Gradient Descent | 0.050796 | 8.703e-01 | 2.326e-03 | 7,200 | 10,000 | iteration_limit |
| 500×16 | 10 | Normal Equations | 0.000021 | 5.730e-15 | 2.496e-15 | 68,000 | Direct | completed |
| 500×16 | 10 | QR | 0.000115 | 6.488e-16 | 8.776e-16 | 68,000 | Direct | completed |
| 500×16 | 10 | SVD | 0.000092 | 1.820e-15 | 2.739e-15 | 68,000 | Direct | completed |
| 500×16 | 10 | Batch Gradient Descent | 0.008683 | 2.622e-07 | 9.994e-08 | 68,000 | 1,180 | completed |
| 500×16 | 10⁶ | Normal Equations | 0.000021 | 1.939e-05 | 7.180e-11 | 68,000 | Direct | completed |
| 500×16 | 10⁶ | QR | 0.000095 | 6.948e-12 | 3.406e-16 | 68,000 | Direct | completed |
| 500×16 | 10⁶ | SVD | 0.000090 | 8.605e-12 | 3.382e-15 | 68,000 | Direct | completed |
| 500×16 | 10⁶ | Batch Gradient Descent | 0.074463 | 6.652e-01 | 6.737e-03 | 68,000 | 10,000 | iteration_limit |

At condition number `10⁶`, Normal Equations loses roughly seven digits of coefficient accuracy (`1.45e-5` and `1.94e-5`) compared with QR and SVD (`1.16e-12` to `8.60e-12`), confirming that squaring the condition number degrades accuracy even when residuals stay small (`10⁻¹¹`). Batch Gradient Descent reaches the 10,000-iteration limit in both ill-conditioned cases with large coefficient error (`0.870` and `0.665`) despite modest residuals (`2.3e-3` and `6.7e-3`). The separate interactive 3D loss surface in the site illustrates `SSE + λ × slope²` with an unpenalized intercept on a two-parameter linear teaching example.

## 6. Reproducibility, governance, and limits

All development artifacts (`results/bike.json`, `results/synthetic.json`, `results/solvers.json`, `results/lasso-convergence-audit.json`) can be reproduced offline via `README.md` commands without re-running the frozen one-time official Bike Sharing evaluation in `results/bike-official.json`. Exploratory tier weights in the web interface reorder views only and never alter selected settings or measured tables.

Remaining limits and human tasks: peak solver workspace memory, multi-machine timing sweeps, and independent external numerical package cross-checks remain out of scope for this benchmark. The six-speaker ten-minute presentation plan lives in `docs/storyboard.md`; speaker name assignments, voice recording, final submission review, and G0 team acknowledgments remain human team tasks and have not been fabricated.
