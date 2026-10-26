# Dataset card

## Price dataset

- Original publisher: abhinavflac/laptops-specs-dataset on GitHub.
- Pinned commit: 79f2b96d4382598eb31f230e278b01a18b117176.
- Publisher describes 992 Indian laptop listings as of December 2025, sourced from Smartprix listings. This date is a publisher claim, not individually timestamped row-level evidence.
- Currency: INR. Target: listed new-laptop price. No transaction or used-condition data.
- Raw source preserved in `data/source_catalog.csv`; original HTML in `data/source.html`.
- Derived `data/catalog.csv` corrects screen diagonals using linked original listing text. See the evidence for 511 corrections in `reports/data_quality.json`.
- The feature transformer encodes missing dedicated VRAM as zero only when `gpu_type` is explicitly Integrated; other missing numerical values are training-median imputed.
- Device categories are the publisher’s automatic heuristics. No human-labelled usage-class ground truth is available.
- Data is small, single-source and historical. Discounts, seller, city, taxes, stock, warranty nuances and actual purchase prices are not fully represented.

## Vision dataset

Real product images are linked to matching catalogue rows using normalized model names and the original saved HTML; the exact model/image/type/source URL linkage is in `data/image_manifest.json`. Collection failures are recorded separately. Perceptual hashes collapse recurring stock photos used for multiple configurations. Source categories label these images, so class ambiguity and publisher label noise remain.

Features: 96×96 RGB letterboxing, HOG (9 orientation bins; 12×12 pixel cells; 2×2 cell blocks), plus 12-bin colour histograms for each RGB channel. The feature array, labels and split indices are included in `data/vision_features.npz`. Downloaded photos are omitted from the deliverable. The downloader allows local re-collection while URLs remain available.

This dataset is catalogue-photo domain only, mostly staged/white-background imagery. It does not support a claim about unrestricted photos, closed laptop lids, blurry scenes, or non-laptop rejection. “General,” “Business,” and “Thin & Light” often overlap in appearance. Exact hardware configuration cannot be identified from an unlabelled stock photo.

## Provenance and licensing

Repository: https://github.com/abhinavflac/laptops-specs-dataset
Original source LICENSE and README are retained. LICENSE says MIT; README says CC0. We preserve the MIT attribution rather than erase it. Third-party image rights are separate and not established by the source repository license. Derived features are included for academic reproducibility, with original image URLs and hashes; raw product photos are not redistributed. Review rights for your intended use before distributing an expanded photo dataset.

## Maintaining a precise model

Collect fresh permissioned listings with listing date, retailer, full SKU/configuration, actual display diagonal, storage type, condition, seller and price. Keep repeated family/SKU entries in the same split. Use a temporal test set from a later month. Manually audit CPU/GPU names, currency and category labels. Do not expand 992 rows into synthetic prices and treat those prices as real evidence. Retrain after drift, and recalibrate intervals on fresh independent data.
