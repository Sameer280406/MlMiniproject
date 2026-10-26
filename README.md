# LaptopLens — Explainable Laptop Price Prediction

A runnable, local Python project for Indian new-laptop price estimates from confirmed specifications, with an image-assisted laptop-category workflow. Includes **three trained regressors, three trained computer-vision classifiers**, bundled models, real training data/derived vision features, API, responsive UI, prediction history, reproducible training, evaluation and tests.

## Run on Windows (recommended Python 3.11)

1. Extract the ZIP. Open the `LaptopLens` folder in VS Code.
2. Install Python 3.11 (64-bit), with “Add Python to PATH” selected.
3. Open a terminal in this folder and run:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

4. Open **http://127.0.0.1:8000**. Leave the terminal running. Stop with Ctrl+C.

You can also double-click `start_windows.bat`. Dependencies need internet on the first installation; bundled model inference runs offline. Python 3.11 is the documented setup; newer compatible versions may work.

## Run on Linux / WSL / macOS

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Or `bash start.sh`. WSL may require `sudo apt install python3-venv` first. Docker: `docker build -t laptoplens .`, then `docker run --rm -p 8000:8000 laptoplens`.

## Use the app

1. Filter the real catalogue and select a configuration to fill every field.
2. Optionally upload a JPEG/PNG/WebP laptop photo and press **Recognize laptop type**.
3. Review the three classifier suggestions and the visually similar catalogue candidates. Load a candidate configuration or apply the suggested type if appropriate. A photo alone cannot reveal the exact RAM/storage/CPU/GPU; enter or confirm those specifications.
4. Tick the confirmation box and press **Estimate price**.
5. Review the estimate, 90% nominal interval, three model estimates, Shapley contributions, and similar historical listings. Export the complete explanation as JSON.
6. Visit **Model results** for measured test errors and **History** for the last estimates. History is local SQLite, limited to 100 records. Uploaded images are processed in memory, not stored.

The estimate predicts **new-laptop historical listing price in INR**, not current offers, sale/transaction prices or second-hand values. No currency conversion, price formulas, synthetic pricing or fabricated training metrics are used.

## Models

| Task | Trained model | Input |
|---|---|---|
| Regression | Ridge | Confirmed laptop specifications |
| Regression | Random Forest | Confirmed laptop specifications |
| Regression | Extra Trees | Confirmed laptop specifications |
| Classification | Logistic Regression | HOG + RGB histograms from real images |
| Classification | RBF Support Vector Machine | HOG + RGB histograms from real images |
| Classification | Extra Trees Classifier | HOG + RGB histograms from real images |

The classification models are genuinely image classifiers: they consume pixels transformed into visual features, never the laptop name, price, or specifications. They classify source laptop usage types. These types are visually ambiguous and weakly labelled; photo recognition is experimental, always confirmed by a person. These are classical computer vision models, not CNNs.

Prices are learned in log space. Categorical variables are one-hot encoded; numerical missing values use training-only medians and scaling. Rating and model name are excluded from predictive features. Validation-only inverse-MAE weights select an ensemble unless the best single model does better on validation. Final models refit train+validation; calibration and test remain held out.

## Training and reproduction

Already-trained models are included; **do not retrain just to launch the app**.

```bash
python prepare_data.py
python train.py
```

Without local raw images, this reproduces the price models only. To retrain all six from raw catalogue photos:

```bash
python prepare_data.py
python collect_images.py
python train.py
```

The image downloader uses URLs linked from the bundled original source HTML, with bounded network timeouts, cached downloads and logged failures. Remote image URLs may expire. Review source image terms before further redistribution. We bundle derived numerical image features and provenance, not the downloaded product photographs.

To reproduce the three image classifiers offline from the included features:

```bash
python reproduce_vision.py
```

Additional fixed-model grouped cross-validation: `python cross_validate.py` (development rows only; final test/calibration excluded). The observed mean ensemble MAE was approximately ₹15,947, versus ₹8,089 on the single final holdout. See `docs/MODEL_CARD.md` and the machine-readable reports for the practical accuracy limits.

Run tests:

```bash
python -m unittest discover -s tests -v
```

Test API docs: **http://127.0.0.1:8000/docs**. Health: `/api/health`. Catalogue: `/api/catalog`. Metrics: `/api/metrics`. Predict: `POST /api/predict` with all 16 feature keys. Classify: `POST /api/classify` with multipart `image`. History: `GET/DELETE /api/history`.

## Files

- `app.py`: FastAPI routes and local history.
- `core.py`: validation, inference, image processing, interventional Shapley explanation.
- `train.py`: leakage-aware price and image training/evaluation.
- `prepare_data.py`: audit and source-linked display repairs.
- `collect_images.py`: real catalogue image linkage and acquisition.
- `reproduce_vision.py`: offline classifier reproduction.
- `static/`: HTML/CSS/JavaScript UI; no external frontend dependencies.
- `models/`: the six trained models and preprocessing.
- `data/catalog.csv`: real Indian listing dataset (992 rows), with audited display corrections.
- `data/vision_features.npz`: derived real-photo HOG/histogram features, labels, split indices.
- `data/image_manifest.json`: image/model/category/source linkage and hashes.
- `reports/`: measured metrics, held-out predictions and split manifests.
- `docs/`: architecture, dataset/model cards, jury guide and limitations.

## Practical limits

High precision cannot be guaranteed for “any image” or unseen specifications. The source is a single historic catalogue with 992 listings, weak category labels, limited brands/configurations and no transaction prices. A product photo does not identify its internal configuration. Confidence scores from the classifiers are not calibrated probabilities of correctness; non-laptop photos may also get a type suggestion. The interface requires specification confirmation.

For a live deployment: collect dated, permissioned fresh listings; audit labels; add diverse user photos and non-laptop rejection examples; evaluate temporal and new-family holdouts; monitor drift; retrain and recalibrate. Authentication, rate limiting and shared-user isolation are not implemented: this app is designed for local academic use. Keep the default localhost binding. Only load the bundled trusted joblib models (pickle-based model files can execute code).

## Credits / license

Source: https://github.com/abhinavflac/laptops-specs-dataset at commit `79f2b96d4382598eb31f230e278b01a18b117176`. Source states 992 Indian listings as of December 2025. Its README says CC0 while its LICENSE file says MIT; both are preserved and the original MIT notice is retained. This does not establish ownership or reuse rights for third-party retailer images; raw photos are excluded from this distribution. Original project code: MIT, see LICENSE.
