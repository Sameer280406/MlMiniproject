# Architecture and workflow

1. Browser loads the local catalogue and forms from FastAPI.
2. Image upload (optional) → EXIF correction → RGB 96×96 letterboxed image → HOG and colour histograms → three independent classifiers → averaged scores → suggested source category. HOG cosine similarity also retrieves catalogue candidates from the real-photo feature bank; this retrieval database includes all collected catalogue examples and is separate from the held-out classification evaluation. Same-photo configurations may be ambiguous. A person confirms the type and internal specifications.
3. Specifications → schema/range validation → training-fitted numerical imputation/scaling and categorical one-hot encoding → three log-price regressors → fixed validation-selected predictor weights → INR estimate.
4. Independent calibration-set absolute log-ratio residual quantile produces the nominal 90% multiplicative prediction interval.
5. Forty-eight sampled training-reference/permutation paths produce interventional Shapley contributions in rupees; contributions plus mean baseline sum to the prediction (apart from display rounding).
6. Encoded specification distance retrieves five training catalogue peers. These provide comparisons, not live quotes.
7. SQLite records the result and specifications on this computer; no uploaded photo is retained.

## Leakage control

Brand/model-family groups are derived from the first three alphabetic words of the source model name. Model name itself is never a price feature. These groups are heuristic and can miss relationships between differently named variants; they are stronger than a random row split but not a perfect product ontology. Train, validation, calibration and test groups are disjoint. Preprocessing is fitted only inside the relevant training partition. Selection uses validation MAE; final regressors refit train+validation only.

Vision exact/perceptual-hash duplicates are collapsed before splitting. Remaining model families are group-held out. Raw photo pixels, not titles/specifications, feed classifiers. Classes with fewer than ten unique photos are excluded and disclosed in reports. No augmentations are split across folds.

The SVM’s probability calibration is internal to its training partition and is not separately group-aware. All averaged classifier scores are treated as uncalibrated suggestions. No image-performance claim is made for arbitrary phone photographs.

## Explanation details

The explanation estimates feature-group Shapley values on the selected regression predictor. It uses 48 seeded random feature permutations and sampled background training rows. At every step one feature is replaced with the user’s value; changes are measured in the actual INR prediction. Each path telescopes from its background prediction to the user prediction, yielding numerical additivity. Per-feature sampling standard errors are exported. These are Monte Carlo errors of attribution, not uncertainty in the price prediction.

This is an interventional approximation: correlated specifications can create unrealistic intermediate combinations. Effects explain model behaviour, not causal hardware prices. The reference baseline varies with the seed/background sample and is not a universal “base laptop cost.”

## API and operational scope

- `GET /api/catalog`: permissible options and source presets.
- `POST /api/classify`: multipart image, maximum 8 MB and 20 megapixels.
- `POST /api/predict`: all 16 feature fields.
- `GET /api/metrics`: reproducible evaluation results.
- `GET/DELETE /api/history`: local results.
- `GET /api/health`: runtime model availability.

One-process local academic deployment; inference is serialized with a lock. There is no cloud account, authentication, background scraper or external image-analysis API. The default run commands bind to localhost. Docker binds within its container; publish only to localhost if desired with `-p 127.0.0.1:8000:8000`. Public/shared deployments need additional controls and separate per-user storage.
