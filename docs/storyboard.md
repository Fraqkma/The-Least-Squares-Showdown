# The Least Squares Showdown — Six-Speaker Video Storyboard

**Status:** Ready for Nipitpon's speaker assignments and team recording. All spoken lines and on-screen cues are in English. Personal teammate names are intentionally left unassigned for Nipitpon to allocate. Every number below matches `results/bike.json`, `results/bike-official.json`, `results/synthetic.json`, `results/solvers.json`, and the live teaching demos.

## Recording format and timing (10:00 total)

Six teammates record independently (1080p, 16:9 browser window at ~1366×768 or 125% zoom on dark theme) and splice their clips in order. Each slot runs **~100 seconds (1:40)**—roughly **210–240 spoken words** at a calm presentation pace.

| Slot | Time | Focus | Screen sections |
| --- | --- | --- | --- |
| Speaker 1 | 00:00–01:40 | Opening question & Least Squares worked example | Overview (`#overview`), Least Squares Lab (`#least-squares` walkthrough) |
| Speaker 2 | 01:40–03:20 | Normal equations, projection & Battle B numerical solvers | Least Squares geometry (`#least-squares`), Battle B (`#battle-b`) |
| Speaker 3 | 03:20–05:00 | Bike Sharing dataset, 48-column design & leakage-free split | Battle A Bike Sharing (`#results`, development table & details) |
| Speaker 4 | 05:00–06:40 | Polynomial overfitting & Synthetic ten-seed validation study | Overfitting Lab (`#overfitting`), Battle A Synthetic tab (`#synthetic-view`) |
| Speaker 5 | 06:40–08:20 | Ridge Regression, unpenalized intercept & 3D loss surface | Least Squares 3D surface (`#least-squares`), Ridge Lab (`#ridge`) |
| Speaker 6 | 08:20–10:00 | Bike Sharing development vs official holdout, weights & limits | Battle A Bike Sharing (`#results` dev + official tables), wrap-up |

### Fast recording setup and Run All fallback

1. Start the local server once before recording:
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn api.main:app --port 8000
   ```
   Open `http://127.0.0.1:8000` in a clean browser window.
2. **Saved-results fallback (recommended during solo recording):** Saved development studies (`results/solvers.json` and `results/synthetic.json`) and the approved one-time official holdout (`results/bike-official.json`) load automatically on first visit. Speakers do **not** need to click **Run All comparisons** while recording unless demonstrating live recomputation (which takes ~40 seconds for the full 10-seed synthetic sweep).
3. **Never rerun `ridge_lab.official` during recording.** The official holdout table reads the frozen artifact `results/bike-official.json` only.

---

## Speaker 1 (00:00–01:40) — Question, Residuals, and the Worked Example

**Starting screen:** `http://127.0.0.1:8000/#overview`

**On-screen sequence:**
1. Pause 5 seconds on **Overview** (`The Least Squares Showdown`), pointing to the question: *"Can we predict how many bikes will be rented in a given hour?"*
2. Click **See how least squares works** (scrolls to `#least-squares`, **From Points to Least Squares**, Step 1 of 4).
3. Click **Next** (Step 2: points `P1 (0, 1)`, `P2 (1, 2)`, `P3 (2, 2)` map to design matrix rows `[1, 0]`, `[1, 1]`, `[1, 2]` and target `y = [1, 2, 2]`).
4. Click **Next** (Step 3: starting line `ŷ = 1 + x`, predictions `[1, 2, 3]`, red dashed residual `−1` at `P3`, `SSE = 1`).
5. Click **Next** (Step 4: line animates to `ŷ = 7/6 + x/2`, residuals `[−1/6, 1/3, −1/6]`, `SSE = 1/6`). Briefly expand **Show normal equations**.

**Verified numbers to say:**
- Observations: `(0, 1)`, `(1, 2)`, `(2, 2)`.
- Starting line: `ŷ = 1 + x`, predictions `[1, 2, 3]`, residual at `P3` is `2 − 3 = −1`, sum of squared errors (SSE) = `1`.
- Fitted line: `ŷ = 7/6 + x/2`, SSE drops from **`1` to `1/6`**.

**Plain-English script:**
> "Welcome to *The Least Squares Showdown*. Our guiding question is practical: can we predict how many bikes will be rented in a given hour? Before we tackle thousands of real bike records, let's see what least squares actually does on three points: `(0, 1)`, `(1, 2)`, and `(2, 2)`.
>
> Clicking **Next**, we turn those three points into a design matrix `X` and a target vector `y`. Notice the first column of `X` is all ones—that column multiplies the intercept `b`, while the second column multiplies the slope `m`.
>
> On Step 3, we try a simple starting guess, `ŷ = 1 + x`. It hits the first two points, but at `x = 2` it predicts `3` when we observed `2`. Using the residual convention observed minus predicted, that error is `−1`. Squaring and adding all residuals gives a sum of squared errors, or SSE, of `1`.
>
> On Step 4, ordinary least squares solves the normal equations `3b + 3m = 5` and `3b + 5m = 6`, giving `ŷ = 7/6 + x/2`. Visually, the fitted line balances small residuals across all three points and cuts the sum of squared errors from `1` down to `1/6`."

**Handoff sentence:**
> "Now that we have the least-squares equations, Speaker 2 will show the projection geometry behind them and why how we solve those equations numerically matters."

---

## Speaker 2 (01:40–03:20) — Projection Geometry and Battle B Numerical Solvers

**Starting screen:** `#least-squares` (scroll to the projection diagram below the 3D surface), then click **Battle B** in the left navigation (`#battle-b`).

**On-screen sequence:**
1. Point to the objective `min ‖y − Aw‖₂²`, the normal equations `AᵀAw = Aᵀy`, and the right-angle projection sketch (`r ⟂ Col(A)`).
2. Click **Battle B** (`#battle-b`). Start on **`100 × 8, condition 10`**; scan the four rows (Normal Equations, QR, SVD, Batch Gradient Descent).
3. Switch **Benchmark case** to **`500 × 16, condition 10⁶`**. Point to Normal Equations' `1.94e-5` relative coefficient error vs QR (`6.95e-12`) and SVD (`8.60e-12`), and point to Batch Gradient Descent's yellow **`Iteration limit (not converged)`** at `10,000` steps.
4. Drag **Runtime weight** from `0.5` to `0.0` (accuracy first: `QR → SVD → Normal Equations`) and then to `1.0` (speed first: `Normal Equations → SVD → QR`), noting that the measured table above never changes.

**Verified numbers to say (`results/solvers.json`):**
- `500 × 16, condition 10⁶` (`68,000` bytes / `66.4 KiB` input arrays only):
  - Normal Equations: relative coefficient error **`1.94e-5`**, residual norm `7.18e-11`.
  - QR factorization: relative coefficient error **`6.95e-12`**, residual norm `3.41e-16`.
  - SVD: relative coefficient error **`8.60e-12`**, residual norm `3.38e-15`.
  - Batch Gradient Descent: hits **`10,000`-step iteration limit**, relative coefficient error **`6.65e-1`** (despite residual norm `6.74e-3`).

**Plain-English script:**
> "Geometrically, ordinary least squares projects the observed vector `y` onto the column space of `A`, so the residual is perpendicular to every column of `A`. That gives the normal equations `AᵀAw = Aᵀy`.
>
> In Battle B, we test four ways to solve the exact same least-squares problem on identical inputs: Normal Equations, QR factorization, singular value decomposition or SVD, and Batch Gradient Descent. On a well-conditioned `100 × 8` matrix with condition number `10`, all four methods finish accurately.
>
> Now watch what happens when we switch to `500 × 16` with condition number `10⁶`, meaning the problem is sensitive to tiny perturbations. Because Normal Equations forms `AᵀA`, it squares the condition number and loses roughly seven digits of accuracy—its relative coefficient error jumps to `1.94e-5`, while QR and SVD stay around `10⁻¹²`. Meanwhile, Batch Gradient Descent hits its `10,000`-step limit without converging, leaving a `66.5%` coefficient error even though its residual looks small. Notice too that our input memory column counts the matrix and target arrays only (`66.4 KiB`), not solver workspace.
>
> Finally, moving the runtime weight slider reorders the completed solvers by accuracy versus speed without touching the measured numbers."

**Handoff sentence:**
> "Having a reliable numerical solver is only half the story—next, Speaker 3 will introduce our real-world Bike Sharing dataset and how we design features without data leakage."

---

## Speaker 3 (03:20–05:00) — Bike Sharing Data, 48-Column Basis, and Chronological Split

**Starting screen:** Click **Battle A** in the left navigation (`#results`, **Bike Sharing** tab active).

**On-screen sequence:**
1. Highlight the opening prompt and **Development validation (five chronological windows)** heading.
2. Scroll slightly to expand **Bike data and selection method** at the bottom of the Bike Sharing panel so viewers see the row counts (`13,915` development rows through Aug 7, 2012; `3,464` reserved later-date holdout rows Aug 8–Dec 31, 2012).
3. Point to the metric definitions right above the development table (`RMSE`, `MAE`, `R²`, `RMSE SD` in rentals per hour).

**Verified numbers to say (`docs/bike_split_contract.md`, `results/bike.json`):**
- UCI Capital Bike Sharing `hour.csv`: `17,379` total hourly records; target `cnt` in **rentals per hour**.
- Fixed **`48`-column** design matrix: `1` intercept + `23` hour indicators (hour 0 reference) + `1` working-day indicator + `23` hour-by-working-day interactions.
- Excluded: `casual` and `registered` (sum identically to `cnt`), plus weather, IDs, and all other raw columns.
- Chronological split: **`13,915` development rows** (Jan 1, 2011–Aug 7, 2012, five expanding chronological windows) and **`3,464` reserved holdout rows** (Aug 8–Dec 31, 2012).

**Plain-English script:**
> "To test least squares on real data, Battle A uses the UCI Capital Bike Sharing hourly dataset, predicting total rentals per hour, `cnt`.
>
> Every model—OLS, Ridge, and Lasso—receives the exact same 48-column design matrix built from just two predictors: hour of day and whether it is a working day. Specifically, we include one intercept, 23 hour indicators using midnight as the reference, one working-day indicator, and 23 interaction columns. Those interactions let the hourly demand curve change shape between weekday commuter peaks and weekend afternoon peaks.
>
> Just as important is what we leave out. The raw file includes `casual` and `registered` counts that add up exactly to `cnt`, so using them would be target leakage. We exclude them, along with weather and IDs, and keep all hours from any calendar date on the same side of every split.
>
> Because bike demand evolves over time, we do not shuffle randomly. We evaluate model settings across five chronological expanding windows covering `13,915` development rows through August 7, 2012, while keeping the final `3,464` later-date rows masked and sealed until protocol freeze."

**Handoff sentence:**
> "Before we reveal those Bike Sharing scores, Speaker 4 will step into our controlled synthetic lab to show why flexible models can overfit and how validation catches it."

---

## Speaker 4 (05:00–06:40) — Polynomial Overfitting and the Synthetic Ten-Seed Study

**Starting screen:** Click **Overfitting Lab** (`#overfitting`), then click **Battle A → Synthetic** (`#synthetic-view`).

**On-screen sequence:**
1. Pause on the three fixed side-by-side plots (**Underfit degree 1**, **Good fit degree 3**, **Overfit degree 12**) on the same seeded split (`seed 42`, noise SD `0.2`, 24 train / 24 validation points).
2. Read the Train MSE and Validation MSE directly beneath each card (`0.19047 / 0.21333`, `0.04294 / 0.06439`, `0.01119 / 0.40449`).
3. Expand **Details for your current overview controls** to point out the unscaled training design condition number (`5.709e6` at degree 9).
4. Click **Battle A** → click the **Synthetic** tab (`#view-synthetic`). Show the 10-seed table across noise SD `0.1`, `0.2`, `0.4`, the `0` convergence failures column, and the Seed-42 validation-MSE-by-degree curve.

**Verified numbers to say (`build_demo`, `results/synthetic.json`, `results/lasso-convergence-audit.json`):**
- Fixed Overfitting comparison (`seed 42`, noise SD `0.2`, 24 train / 24 validation, OLS):
  - Degree 1 (Underfit): Train MSE **`0.19047`**, Validation MSE **`0.21333`**.
  - Degree 3 (Good fit): Train MSE **`0.04294`**, Validation MSE **`0.06439`**.
  - Degree 12 (Overfit): Train MSE **`0.01119`**, Validation MSE **`0.40449`** (>6× worse validation error than degree 3).
- Synthetic ten-seed validation study (`10` seeds × `3` noise levels = `30` splits; `1` validation split per seed and noise level; degrees 1–15 with train-only scaling):
  - Noise SD `0.1`: OLS `0.011672`, Ridge **`0.010059`**, Lasso `0.014724`.
  - Noise SD `0.2`: OLS `0.042793`, Ridge **`0.039585`**, Lasso `0.044113`.
  - Noise SD `0.4`: OLS `0.165028`, Ridge **`0.157390`**, Lasso `0.165766`.
  - Corrected Lasso sweep: **`0` of `1,800`** convergence failures (resolved from `365` in the original 10,000-sweep baseline).

**Plain-English script:**
> "To see overfitting clearly, our Overfitting Lab fits OLS polynomials to the exact same 24 training points and checks them on 24 held-out validation points from a noisy sine wave.
>
> At degree 1, a straight line underfits: training MSE is `0.19047` and validation MSE is `0.21333`. At degree 3, the curve captures the wave and validation MSE drops to `0.06439`. At degree 12, the curve bends through the training noise—training MSE falls to `0.01119`, yet validation MSE spikes more than sixfold to `0.40449`, swinging off the chart near the edges. That gap is overfitting, and the details drawer shows the unscaled matrix condition number climbing sharply at high degrees.
>
> Switching to Battle A's Synthetic tab, we scale features using training statistics only and repeat degree and penalty selection across ten random seeds and three noise levels—one validation split per seed and noise level. After upgrading our Lasso solver to eliminate all `365` baseline iteration failures down to `0` out of `1,800`, Ridge achieves the lowest mean selected validation MSE at every noise level: `0.010059`, `0.039585`, and `0.157390`."

**Handoff sentence:**
> "To see exactly how Ridge shrinks coefficients—and when too much penalty hurts—Speaker 5 will demonstrate the 3D loss surface and our interactive Ridge Regression Lab."

---

## Speaker 5 (06:40–08:20) — 3D Loss Surface and Ridge Regression Lab

**Starting screen:** `#least-squares` (scroll to **Find the lowest loss** 3D surface), then click **Ridge Regression** (`#ridge`).

**On-screen sequence:**
1. On the 3D surface (`#loss-surface`), drag briefly to rotate, set **Surface Ridge penalty λ** to `0` (markers overlap at intercept `1.00`, slope `1.98`, SSE `0.14`), then move `λ` to `5` (OLS stays at slope `1.98`, height `19.76`; Ridge minimum shifts to slope `1.35`, height `13.51`, while intercept stays `1.00`).
2. Click **Ridge Regression** in the left nav (`#ridge`, default degree `9`).
3. Click the preset **`λ = 0 (matches OLS)`** — point out the curves overlap identically (`Validation MSE: OLS 0.07124 · Ridge 0.07124`) and all coefficient bars match.
4. Click **`λ = 0.1`** — point out the grouped signed coefficient bars compressing huge OLS weights (`±10,000` scale) while the intercept stays unpenalized.
5. Click **`λ = 1,000 (strong)`** — show the over-regularized, overly flat Ridge curve and higher validation MSE (`0.3491`).

**Verified numbers to say (`loss_surface`, `build_demo` at degree 9):**
- 3D two-parameter surface (`SSE + λ × slope²`, intercept unpenalized):
  - `λ = 0`: OLS and Ridge coincide at intercept `1.00`, slope `1.98`, SSE `0.14`.
  - `λ = 5`: OLS stays at slope `1.98` (surface height `19.76`); Ridge pulls slope to `1.35` (minimum height `13.51`), intercept unchanged at `1.00`.
- Ridge Lab (degree `9`, seed `42`):
  - `λ = 0`: OLS and Ridge validation MSE match identically at **`0.07124`**.
  - `λ = 0.1`: Ridge validation MSE **`0.09765`** (note: at degree 12, `λ = 0.1` cuts validation MSE from `0.40449` to `0.08892`).
  - `λ = 1,000`: Ridge flattens and underfits; validation MSE rises to **`0.3491`**.

**Plain-English script:**
> "Here in our two-parameter 3D loss surface, every point on the floor is a candidate line with an intercept and a slope, and height is the objective value. At `λ = 0`, the height is pure SSE, so the OLS and Ridge markers overlap at intercept `1.00`, slope `1.98`. When we raise `λ` to `5`, the height becomes `SSE + 5 × slope²`. Notice the bowl steepens only along the slope axis—the intercept is never penalized—so Ridge pulls the slope down to `1.35` to reach the new minimum.
>
> Moving to the Ridge Regression Lab at degree 9, we can use the quick-compare presets. At `λ = 0`, Ridge and OLS match identically with validation MSE `0.07124`, and every coefficient bar lines up. At `λ = 0.1`, look at the signed coefficient bars below: OLS swings wildly to compensate for correlated polynomial powers, while Ridge pulls those non-intercept weights sharply smaller and leaves the intercept free.
>
> Regularization is a trade-off, not magic. Clicking `λ = 1,000` applies too much penalty—the Ridge curve becomes too flat and validation MSE climbs to `0.3491`."

**Handoff sentence:**
> "With all of our models and tools in place, Speaker 6 will present the Bike Sharing development results, our frozen official later-date test, and our main takeaways."

---

## Speaker 6 (08:20–10:00) — Bike Sharing Results, Official Holdout, and Conclusions

**Starting screen:** Click **Battle A** (`#results`, **Bike Sharing** tab).

**On-screen sequence:**
1. Show the **Development validation (five chronological windows)** summary and table (`OLS` / `Ridge λ = 0`: `117.460` RMSE; `Lasso α = 0.001`: `117.474` RMSE; window RMSE SD `36.719`).
2. Briefly move one slider in **Explore development tier weights** to show it updates only the exploratory order line (`OLS = Ridge → Lasso`) while measured values stay untouched.
3. Scroll down to **Official later-date test (holdout)** (`Aug 8–Dec 31, 2012`, `3,464` rows, loaded from `results/bike-official.json`). Read the frozen official scores (`OLS` and `Ridge`: `144.516` RMSE, `101.182` MAE, `0.56949` R²; `Lasso`: `144.531` RMSE, `101.188` MAE, `0.56940` R²).
4. Mention saved-results reproducibility (`Run All comparisons` recomputes development studies live without ever re-running official holdout scoring) and close.

**Verified numbers to say (`results/bike.json`, `results/bike-official.json`):**
- Development validation (5 chronological windows, `13,915` rows):
  - OLS & Ridge (`λ = 0`): Mean RMSE **`117.460`**, MAE `83.835` rentals/hour, R² `0.47144`, window RMSE SD **`36.719`**.
  - Lasso (`α = 0.001`): Mean RMSE **`117.474`**, MAE `83.838`, R² `0.47132`, window RMSE SD `36.728`.
- Official later-date holdout (Aug 8–Dec 31, 2012, `3,464` rows, one-time frozen run):
  - OLS & Ridge (`λ = 0`): RMSE **`144.516`**, MAE **`101.182`** rentals/hour, R² **`0.56949`**.
  - Lasso (`α = 0.001`): RMSE **`144.531`**, MAE **`101.188`** rentals/hour, R² **`0.56940`**.

**Plain-English script:**
> "Let's bring everything back to our Bike Sharing question. Across the five chronological development windows, OLS and Ridge tie at a mean validation RMSE of `117.460` rentals per hour because Ridge's grid selects `λ = 0`, and Lasso at `α = 0.001` is nearly identical at `117.474`. Notice the window-to-window standard deviation is about `36.7` rentals per hour—much larger than the `0.014` gap between models. Moving our exploratory tier weights changes only the exploratory ordering line, never the measured results.
>
> After freezing these settings and refitting once on all `13,915` development rows, we scored the separate later-date holdout of `3,464` rows one time. On those unseen late-2012 dates, OLS and Ridge tie again at `144.516` RMSE (`101.182` MAE, `0.56949` R²), with Lasso just `0.015` rentals per hour behind at `144.531`.
>
> Why did Ridge tie OLS here when Ridge won our synthetic study? Because `13,915` rows with a full-rank 48-column basis is well-conditioned—regularization shines when features are collinear or samples are scarce, not automatically on every dataset.
>
> Everything we showed is reproducible offline from our saved artifacts and test suite, with clear limits noted in our report. Thank you for watching *The Least Squares Showdown*."

**Closing beat:** Hold 3 seconds on the official holdout table and site footer.

---

## Presenter Q&A (quick answers for live questions)

- **Why does SSE drop from `1` to `1/6` in the worked example?**
  The starting guess `ŷ = 1 + x` passes through `(0, 1)` and `(1, 2)` with zero error but misses `(2, 2)` by `−1`, giving `SSE = 0² + 0² + (−1)² = 1`. Solving `XᵀXβ = Xᵀy` shifts the line to `ŷ = 7/6 + x/2`, trading one large error for three small balanced errors `[−1/6, 1/3, −1/6]` whose squares sum to `1/36 + 4/36 + 1/36 = 1/6`.
- **Why does degree 12 overfit on seed 42?**
  With only `24` training points, a degree-12 polynomial has `13` free parameters—enough flexibility to bend through random noise (`Train MSE 0.01119`). Between training points and near the edges of `[0, 1]`, those large alternating coefficients oscillate wildly, driving validation MSE up to `0.40449` (over 6× worse than degree 3's `0.06439`).
- **Why does Ridge tie OLS on the Bike Sharing official holdout?**
  During five-window chronological development validation over `{0, 1, 10, 100}`, Ridge achieved its lowest mean RMSE at `λ = 0`. Because Ridge with `λ = 0` solves the exact same unpenalized objective as OLS on the same 48-column matrix, the frozen refitted models have identical coefficients and identical official holdout scores (`144.516` RMSE). With `13,915` rows and a full-rank `48`-column indicator basis, OLS does not suffer from high-variance overfitting here.
- **How should we interpret Batch Gradient Descent hitting its iteration limit?**
  In both `condition = 10⁶` cases, the objective surface is stretched `10¹²` times wider in one direction than another, so fixed-step gradient descent (`step = 1 / ‖A‖₂²`) creeps along the flat valley and hits the `10,000`-step budget before reaching `‖∇‖ ≤ 10⁻⁸`. That leaves a `66%–87%` relative coefficient error even though the residual norm looks small (`2.3e-3` to `6.7e-3`), illustrating why direct orthogonal methods (QR/SVD) are preferred for ill-conditioned least-squares systems and why Battle B excludes incomplete runs from its exploratory solver order.
