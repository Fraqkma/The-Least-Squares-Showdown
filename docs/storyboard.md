# The Least Squares Showdown — Project and Video Storyboard

**Draft for Nipitpon's final presentation review; no teammate approval is implied.** English-only project copy. Development and approved official Bike Sharing results are labeled separately.

## Audience and question

Linear Algebra students who know projections and least squares. The English presentation opens with **“Can we predict how many bikes will be rented in a given hour?”** Battle A uses this real-world question; the synthetic curve still teaches degree selection and overfitting.

## Ten-minute video outline — six equal speaking windows

| Time | Speaker | Planned explanation |
| --- | --- | --- |
| 00:00–01:40 | Speaker 1 | Ask the bike-rental question and connect prediction error to least-squares projection. |
| 01:40–03:20 | Speaker 2 | Show the normal-equation intuition, a small hand example, and why the implementation uses a stable solver. |
| 03:20–05:00 | Speaker 3 | Introduce UCI `hour.csv`, `cnt`, and the hour-by-working-day design: the hourly rental pattern can change on working days. Explain that both hour and working-day effects remain in the model. |
| 05:00–06:40 | Speaker 4 | Explain future-date validation for bikes and the separate synthetic degree/overfitting experiment. Use actual development results only when cited. |
| 06:40–08:20 | Speaker 5 | Explain OLS/Ridge/Lasso penalties and use the genuine two-parameter 3D loss surface as the main Battle B demonstration. Keep Battle B's solver ranking separate. |
| 08:20–10:00 | Speaker 6 | Compare Battle A by RMSE in rentals/hour, with MAE, R², and window variation; show the approved official future-date scores separately and explain their limits. |

Each member speaks for approximately 100 seconds in English. The final script and figures must reflect the frozen protocol and actual measured results.

## Page flow

| Screen | What the learner sees | Takeaway |
|---|---|---|
| Overview | Hourly bike-rental prediction question, the Battle A case study, and links to the separate synthetic lesson | A close fit to observed points can still generalize poorly. |
| Least Squares Lab | Four-step point-to-matrix worked example, OLS/Ridge/Lasso formulas, then the 3D intercept/slope loss surface | SSE falls from 1 to 1/6 in the worked example; the 3D height is SSE plus any Ridge slope penalty. |
| Overfitting | Fixed degree 1, 3, and 12 OLS plots on one seeded split, each with train and validation MSE; the overview degree slider remains free exploration | A close training fit can have worse validation predictions. |
| Ridge Regression | A local lambda slider synchronized with the overview, OLS/Ridge fit overlay, validation errors, and signed grouped coefficient bars | At lambda 0 the fits match; a large lambda makes this illustrative fit flatter and raises its validation MSE. |
| Results | Bike RMSE ranking with MAE, R², and validation-window variation; later, a frozen sealed-test table | Test data evaluates a frozen choice; it does not select one. |

## Shared visual and interaction rules

- Show split labels and define every metric; mark illustrative views as such and never invent measurements.
- Keep degree and lambda controls consistent across pages; default random seed is 42 and reruns do not resample.
- Make the train/validation/test distinction visible wherever results appear.
- Keep explanations next to plots and state when a 3D surface is a two-parameter slice.
- Keep user-adjusted tier weights for exploratory rankings; label them clearly and preserve the fixed primary Battle A RMSE and separate Battle B solver ranking.

## Visual direction

Measured, academic, and readable on a dark screen. Plots carry the color; the residual marker identifies the difference between an observed point and its fitted value.

## Current implementation status

The responsive single-page HTML interface, FastAPI adapter, seeded fit plot, coefficient comparison, development-only bike result table, and exploratory tier-weight controls now exist. The solver comparison, synthetic degree and lambda sweeps, and Battle B 3D surface are implemented. The one-time official Bike Sharing holdout result is recorded separately from development metrics. This storyboard is still a review target for the named content owners, not a claim that they approved the page copy.

## Consolidated recording plan

| Slot | Talking points and screen | Transition |
| --- | --- | --- |
| Speaker 1, 00:00-01:40 | Open: "Can we predict how many bikes will be rented in a given hour?" Show bike development table, define rentals/hour and residuals. | Turn prediction into a projection problem. |
| Speaker 2, 01:40-03:20 | Explain A beta, residual orthogonality, A transpose A beta = A transpose y; use QR/SVD instead of explicit inversion. Show solver outputs and failed/limited runs. | A stable solve still needs a suitable model. |
| Speaker 3, 03:20-05:00 | Show fixed 48-column bike basis and date windows. Working days change the hourly pattern. Explain component-count leakage and reserved future dates. | Compare models with identical information. |
| Speaker 4, 05:00-06:40 | Show synthetic degree selection and ten seeds. Discuss train-only scaling, noise, conditioning, and the resolved 365-to-0 Lasso convergence audit. Label selection values as validation results. | Penalties change the fitted coefficients. |
| Speaker 5, 06:40-08:20 | Show full 3D intercept/slope surface; rotate it and move lambda from 0 to 5. Explain the unpenalized intercept and OLS/Ridge markers. | Compare evidence without changing the primary metric. |
| Speaker 6, 08:20-10:00 | Show development RMSE 117.460 for OLS/Ridge and 117.474 for Lasso, then the separately labeled official future-date RMSE 144.516, 144.516, and 144.531 rentals/hour. Explain the unchanged settings, exploratory weights, and limitations. | Close with reproducibility and future-date evaluation. |

Demo order: start the local server, show the four worked-example steps, rotate the 3D surface and adjust its separate penalty, compare the three fixed overfitting plots, then set Ridge lambda to zero and a high value. Open both Battle A views and two Battle B cases. Click Run All if time allows, then change exploratory weights. Long-run fallback: use the saved site results and the report; use the recorded official Bike Sharing result only with its official label. Actual six voices and assignment of teammates remain Nipitpon's recording task.

## Presentation layout verified after official evaluation

The dark site opens the Least Squares Lab with the four-step worked example and keeps the 3D loss surface below its formula cards, with its own penalty control and objective beside it. Saved synthetic and solver studies appear on first load; Run All sits inside the page shell with live status and recomputes them. Battle A has Bike Sharing and Synthetic views; the bike development table and approved official future-date table are separate. Battle B presents all four measured solvers per matrix case and excludes iteration-limited runs from its exploratory order. The bottom of the page ends with Battle B methodology and the footer. At 1365 x 768 and 390 x 844, the page has no horizontal overflow; wide data tables scroll within their own panels. Speaker 1 should start with the worked example, Speaker 4 should switch to Synthetic, Speaker 6 should show the recorded official result. No second official scoring run belongs in the live demo.

## Presentation readability demo clicks

Open Least Squares Lab. Click Next three times to map each point to its matrix row, see the starting residual, and reach the fitted line; use Back and Reset to repeat. Show the three objective cards, then drag the 3D surface and move its separate penalty slider from 0 to 5. Scroll to Overfitting Lab: compare degree 1, 3, and 12 plots and read train/validation MSE below each; move the overview Degree control only for free exploration. In Ridge Regression, check lambda 0, 0.1, and 1,000 with the synchronized section slider. Point to the OLS/Ridge overlay, validation MSE, and signed coefficient bars. Open Battle A Bike Sharing and Synthetic tabs, then change Battle B cases and exploratory weights. Click Run All only if time allows; the saved studies appear on first load. Keep the six speaking slots and the ten-minute plan above.
