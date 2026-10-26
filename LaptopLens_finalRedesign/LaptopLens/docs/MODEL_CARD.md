# Model card and measured results

## Price prediction
- Real listings: 992; held-out price test rows: 172.
- Selected predictor MAE: ₹8,089; RMSE: ₹15,619; R²: 0.8736.
- MAPE: 9.87%; median percentage error: 7.25%.
- Nominal interval coverage: 90%; observed test coverage: 95.35%.

The interval is a prediction × exp(±q) interval, with q estimated independently on calibration families. Grouped data is not identical to an iid row setting; nominal coverage is a calibration target, not a universal guarantee. Temporal drift and photo-assisted wrong specifications can invalidate coverage.

| Model | MAE (INR) | R² | MAPE |
|---|---:|---:|---:|
| Ridge | 9,532 | 0.8098 | 11.34% |
| Random Forest | 8,692 | 0.8674 | 10.82% |
| Extra Trees | 8,264 | 0.8862 | 10.30% |

Validation-family MAEs are substantially larger than the test MAEs. The partitions differ in composition, so this one split is not a robust guarantee of deployment accuracy. Additional 3-fold family-group validation on development rows yielded a fixed equal-weight ensemble mean MAE of ₹15,947 (Ridge ₹22,054; Random Forest ₹15,951; Extra Trees ₹16,018). This shows meaningful variation between unseen families. Calibration and final test rows were excluded. Temporal evaluation on larger fresh data remains necessary for operational use. No accuracy target was met by generating synthetic labels.

## Computer vision
- 991 linked real images downloaded; 607 unique perceptual hashes.
- Training: 448; test: 159.
- Five source categories: Business, Convertible, Gaming, General, Thin & Light.

| Classifier | Accuracy | Balanced accuracy | Macro F1 |
|---|---:|---:|---:|
| HOG + Logistic Regression | 71.70% | 68.06% | 0.6314 |
| HOG + RBF SVM | 71.07% | 53.80% | 0.5551 |
| HOG + Extra Trees | 65.41% | 57.42% | 0.5409 |

Confidence scores are not calibrated correctness probabilities. The source usage categories are weak labels; class appearance overlaps. Always confirm. No open-set/non-laptop rejection model or arbitrary-photo validation is included. HOG retrieval can suggest visually similar catalogue configurations, but stock-photo reuse makes internal hardware ambiguous.

## Reproducibility and limitations
Fixed seeds and pinned dependency versions are included. Machine-readable metrics, test predictions, split memberships, provenance and data-quality corrections accompany the project. Models are trusted pickle-based joblib artifacts. A specific prediction can be explained by additive approximate interventional Shapley contributions; explanations reveal model behaviour, not causal prices.
