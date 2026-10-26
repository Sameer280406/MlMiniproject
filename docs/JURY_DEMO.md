# Five-minute honest demonstration

1. **Problem (30 seconds):** Similar-looking laptops can differ greatly in components and price. LaptopLens estimates new-laptop listing value and explains it.
2. **Specification estimate (60 seconds):** Select a real catalogue configuration, confirm the hardware, and predict. Explain that the model uses 16 specifications and three trained regressors. Display the INR estimate and uncertainty interval.
3. **Explainability (60 seconds):** Explain the training-reference baseline and positive/negative Shapley contributions. Contributions sum to the predictor output. They are model attributions, not causal component price tags.
4. **Image flow (60 seconds):** Upload a laptop photo, show all three visual classifiers, then explicitly confirm type and hardware. Say that stock photos cannot distinguish RAM/storage configurations. Category recognition is experimental; show measured accuracy without implying universal reliability.
5. **Evidence (60 seconds):** Open Model results. Describe family-group holdouts and deduplicated photos. R² applies to regression; accuracy/macro-F1 apply to classification. Explain the historical data limitation.
6. **Practical use (30 seconds):** Export the explanation, show history, then describe fresh-data collection as the route to live-market accuracy.

If recognition is wrong, correct the type in the form; this is the designed human-confirmation workflow. Do not claim the app fetches live shop offers or reads invisible hardware from a photo.
