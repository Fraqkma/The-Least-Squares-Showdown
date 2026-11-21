# The Least Squares Showdown — Presentation Readability Pass

Implement this task in the existing MTH234 repository. The goal is a site a classmate can follow during a ten-minute presentation. Keep the existing dark visual style and make the important numbers, graphs, and controls easy to find. Use plain English throughout the site.

## 0. Start from the current site

- Read the repository root's `AGENTS.md` and `task.md`, inspect the working tree, and open the local site. Treat this brief as the current presentation pass within the existing project roadmap.
- Use the current FastAPI, vanilla HTML/CSS/JS, and local Plotly setup. Inspect the actual rendering before changing the layout.
- Start with `frontend/index.html`, `frontend/js/walkthrough.js`, `frontend/js/app.js`, `frontend/js/state.js`, `frontend/js/api.js`, `frontend/js/studies.js`, and `frontend/js/charts/`. Locate the table and layout styles before editing them.
- The current overview already has a degree control and a Ridge λ slider, and `charts/coefficients.js` already uses grouped bars. Reuse the existing state, fits, and chart. The 3D surface has its own λ because it represents a separate two-parameter teaching model.
- Read the saved Bike Sharing official metrics from the existing artifact. Preserve the CSV bytes, official scoring record, experiment settings, model-selection rules, and ranking logic. Use the existing development and demo paths for verification.
- Finish the work in the order below and carry routine implementation choices through to completion. Bring Nipitpon one final review. Put any unresolved scope or scientific decision in that handoff and continue work that can proceed independently.

## 1. Least Squares Lab

### Worked example

Keep the four-step demo and the shared observations `(0, 1), (1, 2), (2, 2)`. Put each formula beside the plot state where it first matters.

- Step 1 shows the observed points. Label axes **Input x** and **Observed y**.
- Step 2 shows how a point maps to a row `[1, x]` in the design matrix and a value in the target vector. Keep the point and row labels easy to track.
- Step 3 shows the straight-line equation `ŷ = b + mx`. Define `b` as the intercept and `m` as the slope. Show the starting line `ŷ = 1 + x`, its predictions `[1, 2, 3]`, and the residual sign convention `eᵢ = yᵢ − ŷᵢ`. Spell out **Sum of squared errors (SSE)** at first use and show `SSE = Σ(yᵢ − ŷᵢ)²`. For the starting line, show `0² + 0² + (−1)² = 1`.
- Step 4 shows the fitted line `ŷ = 7/6 + x/2`. Keep the normal equations and the two short scalar equations available in the step. Make the main result visible at presentation size. Use wording like **“The fit cuts total squared error from 1 to 1/6.”** Keep the fraction `1/6` visible. Show that it comes from `(−1/6)² + (1/3)² + (−1/6)² = 1/6`.
- Use **SSE** consistently for the sum of squared errors. The peer feedback used “SEE” for this quantity. Leave the OLS, Ridge, and Lasso objective formulas and optional derivations available nearby.
- Check Back, Next, Reset, rapid switching, keyboard navigation, and reduced motion after editing the copy and layout.

### 3D loss surface

- Rename **Rotate the loss surface** to a title that tells the viewer what they are looking at, such as **“Find the lowest loss.”** Add brief interaction copy such as “Drag to look from another angle.”
- Name all three axes in the actual Plotly scene and in adjacent text. Match the API's order and labels. The two horizontal quantities are **intercept** and **slope**. The vertical quantity is the displayed **objective value**. The SSE term can be shown by itself at λ = 0. For λ > 0, label the height as `SSE + λ × slope²`.
- Explain the purpose of the graph in one short sentence. Each spot represents a candidate line, and the height shows its loss.
- Add short OLS/Ridge descriptions beside the controls. For example, “OLS finds the line with the smallest SSE.” Then “Ridge adds a cost for a large slope. The intercept stays free of the penalty.”
- Check the meaning of both markers. If OLS and Ridge are shown on the same displayed Ridge surface at λ > 0, place both markers using the displayed objective and label the OLS marker **OLS solution**. If separate surfaces are shown, label each marker with its own objective. Make overlapping markers at λ = 0 understandable and ensure marker labels and axes remain readable after rotating.
- Keep the penalty control and its current value visible next to the plot. Make the default camera readable and verify that dragging the plot and moving the slider still work.

## 2. Overfitting Lab

### Add a comparison the viewer can see at a glance

- Add three clearly labeled fit plots **Underfit**, **Good fit**, and **Overfit**. Show them together on a wide screen and stack them in that order on a narrow screen.
- Use the existing seeded teaching dataset and OLS fit pipeline for all three. Hold the train/validation split, observations, and noise fixed. Vary polynomial degree. Use shared x and y axes when presenting the direct comparison. If a fit has extreme excursions, make the shared view and any off-scale behavior explicit so the visible comparison stays honest.
- Choose three example degrees after checking the actual curves and metrics on the existing seeded split. A good example degree should have lower validation error than the illustrative extremes. The overfit example should visibly follow training noise and have higher validation error than the good fit. Verify the low-degree example misses visible structure. Show each degree in the heading or caption.
- Use the same marker styles for train and validation in all three charts, a single shared legend where practical, and short captions tied to the visible evidence. Example wording for captions when supported by the plotted data: “Misses the shape,” “Follows the main pattern,” and “Chases noise in the training points.”
- Show **Train MSE** and **Validation MSE** below each plot or immediately beside it. State once that **MSE (mean squared error)** is lower when the fit makes smaller squared prediction errors. Include the real values from the fit. Keep all three plots useful before the viewer touches the slider.
- Keep the existing degree slider as the free-exploration control and make its location obvious. Avoid using that slider to silently replace the three fixed demonstration cases. Reuse existing demo responses or a small number of supported API calls, then reuse the results when possible.

### Rewrite the prose and simplify diagnostics

- Use short, conversational English beside the controls. Start with lines such as “Move Degree to change how much the curve can bend.” and “Fit on the training points. Check how well the curve predicts the validation points.”
- Describe overfitting with a concrete comparison. “A wiggly curve can fit the training points closely and still miss new points.” Use conditional wording when the observed data varies.
- Put train and validation error together where the viewer looks for them. Keep the deeper diagnostic readouts within a concise **Details** section if they compete with the graphs.
- Keep **Condition number** available with an explanation like “Shows how sensitive the calculation is to small changes.” Name the matrix being measured, currently the unscaled training design. Show this as a numerical diagnostic and keep validation MSE as the visible prediction check.

## 3. Ridge Regression

- Put a **Ridge penalty λ** slider inside the Ridge section, beside the coefficient chart or fit preview. Use the existing log-scale range and exact λ = 0 control. Keep one shared state with the overview setting if both remain visible. Opening this section should show the current actual λ, including zero, and the effect of changing it.
- Start with copy like “Move λ to change how strongly Ridge pulls the coefficients toward zero.” Add a short prompt to try a high λ and check the curve and validation error. If the current degree or split does not visibly underfit at the largest permitted value, describe what the fit actually does or show a verified preset within the existing parameter range.
- Keep a visible OLS/Ridge fit overlay and the validation errors within reach of the Ridge controls. Use the same degree, train split, and train-fitted basis for both models. At λ = 0 both fits should agree within numerical tolerance.
- Improve the existing grouped coefficient bars. Keep **OLS and Ridge side by side for each coefficient**, with a clear zero line, signed values, and readable legends and axis labels in the actual dark theme. Label the intercept and note that it is left out of the penalty. Identify that the non-intercept coefficients are in the training-standardized polynomial basis.
- Make the coefficient chart respond to λ. Positive and negative coefficients must remain distinguishable. Use wording about overall shrinkage, since individual coefficients can move differently when features are correlated. At a high λ, show the simpler fitted curve and the actual validation error so the viewer can judge underfitting.
- Keep the 3D two-parameter surface slider independent and label it in the context of that surface. Confirm that rapid changes to the Ridge teaching controls leave the plot, readouts, and coefficient chart showing the latest selection.

## 4. Battle A and Battle B

### Add one short summary per results view

- Battle A **Bike Sharing** explains the prediction in the first sentence, using “rentals per hour.” Put a short result near the relevant table. With the current official artifact, “OLS and Ridge tie at λ = 0. Lasso is very close on the official test.” Development validation and the official later-date test retain separate, clear headings.
- Battle A **Synthetic** gets its own summary driven by the current result. With the corrected saved study, Ridge has the lowest mean selected validation MSE at each noise level, and all Lasso fits completed. Keep the ten-seed and validation context visible without putting the whole methodology above the table.
- Battle B starts with “Four methods solve the same least-squares problem.” Add a brief summary for the selected case, based on available successful results and statuses. Identify the fastest completed method or the method with lowest measured coefficient error when useful. Distinguish ties, missing data, and iteration limits. Avoid a universal winner claim.
- Keep exploratory weight changes next to the ordering they affect. A short line should tell viewers what the weights control. Changing them leaves the measured table values intact.

### Make the tables readable

- Use descriptive but short column headings. Define **RMSE**, **MAE**, **R²**, **MSE**, **Noise SD**, and **RMSE SD** only where they appear, in a short legend or details line. Give directions such as lower RMSE/MAE and higher R². Keep units with the metric or caption.
- For Battle B, translate **relative coefficient error** as distance from the benchmark reference coefficients, **residual norm** as size of the remaining prediction error, and **condition number** as calculation sensitivity. Check the implementation before naming exactly what each metric includes. Keep **input memory** labeled as input arrays only. Define **iteration limit** in plain English.
- Align numbers with tabular digits, use readable contrast and row spacing, and keep model or solver names easy to scan. Format decimal precision consistently. Preserve small differences where they are worth comparing and preserve access to the detailed values.
- Give narrow tables their own horizontal scroll if needed. The page itself should fit at 390 px. Keep semantic headings, captions, focus styles, and accessible names. Keep explanatory text at a comfortable body size and favor one short sentence per idea.
- Audit the surrounding copy for formal or unexplained phrases such as “polynomial capacity,” “constrain the coefficients,” and bare status codes. Use everyday words at first mention and keep accurate terms in labels and methodology. Keep the UI focused on the current task and place longer definitions behind existing details or beside the relevant chart.

## 5. Verify and hand off

1. Start the app using the existing local run command. Open a fresh browser session at desktop presentation size and at roughly 390 px.
2. Walk all four intro steps. Check the x/y mapping, line equations, residual sign, and exact `1 → 1/6` SSE result. Rotate the 3D surface, verify all axis labels, move λ, and check the OLS/Ridge markers against the plotted objective.
3. Check the three overfitting plots against one seed and split. Confirm each caption matches its curve and its actual train and validation scores. Check the Ridge section at zero, a positive value, and a high value. Confirm slider sync, grouped bars, fit curves, and correct labels.
4. Open both Battle A views, switch at least two Battle B cases, change tier weights, and run **Run All**. Verify that summaries and tables handle loading, success, and existing failure statuses without stale results. Check keyboard use, narrow-table scrolling, and lack of page-wide horizontal overflow.
5. Run the repo's relevant Python tests, Ruff, existing JS checks as available, and `git diff --check`. Run a targeted regression check if you change how fit data or surface markers are computed. Keep the recorded official results and CSV provenance intact.
6. Update the demo clicks in `docs/storyboard.md` if this pass changes the presentation sequence. Preserve the six speaking slots and the overall ten-minute plan.
7. Return one handoff with the changed files, the three chosen degrees and their train/validation MSE, the visible Ridge high-λ behavior, and the browser and test results. Note anything you could not verify, and ask Nipitpon only for a decision that genuinely needs human judgment.
