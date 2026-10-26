# Verification

- Five automated test cases passed: API prediction/history flow; invalid/missing input rejection; disjoint price/vision family groups and image hashes; explanation additivity and prediction bounds; image classification and candidate-spec schema.
- All six trained model artifacts load and infer successfully.
- Frontend JavaScript syntax check passed.
- DOM integration check passed: all 16 fields populated from API, real prediction rendered (₹203,860 for the first catalogue preset), both model-results tables rendered, local history rendered.
- Browser visual rendering was not verified: the available Chromium download returned invalid archives. Responsive CSS is implemented, but screenshot/layout QA is not claimed.
- Price holdout metrics, independent interval coverage, vision confusion matrices and development-only three-fold family validation are included as machine-readable reports.
- Runtime used for verification: Python 3.12. See environment.json for package versions. Windows launcher/Python 3.11 setup instructions are supplied; a native Windows execution was not available for testing.
- Raw downloaded photographs, local test history, caches, virtual environments and browser-test dependencies are excluded from the ZIP. Offline image classifier retraining uses bundled real-photo numerical features.
- Clean extracted ZIP: all five automated tests passed without raw images. Price-only retraining and offline three-classifier retraining completed; price MAE reproduced to floating-point precision.
