# PRAVAH Model B — Prototype Handoff

## 1. Overview

PRAVAH Model B is a prototype route ETA adjustment and
multi-route ranking pipeline.

It uses:

- OSRM route candidates and baseline travel durations.
- Contextual observations derived from Model A.
- A Random Forest delay-factor regressor.
- Reconstructed ETA for each candidate route.
- Route ranking based on predicted reconstructed ETA.

The prototype is intended for integration with the
TypeScript frontend.

---

## 2. Model behavior

The model predicts a delay factor rather than an absolute ETA.

ETA reconstruction:

predicted_eta_minutes =
    osrm_duration_minutes * predicted_delay_factor

The prototype bounds the delay factor using:

- Minimum: 1.0
- Maximum: 1.75

The route with the lowest predicted reconstructed ETA
receives rank 1 within its candidate trip.

---

## 3. Main model files

Directory:

`/content/drive/MyDrive/SIH/models/pravah_model_b`

Important files:

- `model_b_delay_factor_regressor.joblib`
  Trained delay-factor regression model.

- `model_b_delay_factor_schema.json`
  Model feature schema, target definition, and bounds.

- `model_b_delay_factor_metrics.json`
  Training and evaluation metrics.

- `model_b_final_labeled_dataset.csv`
  Final labeled dataset used for model development.

- `model_b_v2_multi_route_predictions.csv`
  Multi-route inference results.

- `model_b_v2_multi_route_predictions.json`
  Multi-route inference results in JSON format.

- `model_b_multi_route_geometries.json`
  Saved route geometries.

- `model_b_frontend_package.json`
  Frontend-ready package containing ranked routes
  and their GeoJSON geometry.

---

## 4. Frontend package structure

The frontend package contains:

- Package metadata.
- Model metadata.
- Dataset summary.
- Ranking method.
- Trip records.
- Two route alternatives per trip.

Each trip contains:

- `trip_id`
- `preferred_route_id`
- `routes`

Each route contains:

- `route_id`
- `route_number`
- `distance_km`
- `osrm_duration_minutes`
- `predicted_delay_factor`
- `predicted_eta_minutes`
- `eta_overhead_minutes`
- `predicted_route_rank`
- `predicted_preferred_route`
- `geometry`

The geometry is GeoJSON-style geometry with coordinate
pairs in `[longitude, latitude]` order.

---

## 5. Ranking behavior

Routes are ranked within each trip using ascending
`predicted_eta_minutes`.

- Rank 1: lowest predicted reconstructed ETA.
- Rank 2: second-lowest predicted reconstructed ETA.
- `predicted_preferred_route`: true only for rank 1.

The current evaluation contained:

- 10 unique trips.
- 20 route records.
- 2 routes per trip.
- 100% agreement with the synthetic preferred-route labels.
- 100% agreement with OSRM-only route selection.

The agreement results do not establish real-world route
safety, ETA accuracy, or improved routing performance.

---

## 6. Training and validation limitations

The current prototype has important limitations:

1. Delay-factor labels are synthetic.
2. The training dataset contains only 10 unique trips.
3. Training rows include synthetic augmentation.
4. The ETA model has not been validated against genuine
   historical travel-time observations.
5. Nearest Model A observations are used as a proxy for
   route exposure.
6. The current route-ranking evaluation selected the
   same routes as OSRM-only ranking for all evaluated trips.
7. The model should be described as a prototype and not
   as a validated real-world ETA or safety predictor.

---

## 7. Integration guidance

The TypeScript frontend should treat the output as a
prototype prediction package.

Recommended frontend behavior:

- Display route geometry using the route's `geometry`.
- Display OSRM duration separately from predicted ETA.
- Identify rank 1 using `predicted_route_rank`.
- Preserve model metadata and limitations where relevant.
- Do not present synthetic predictions as guaranteed
  arrival times.
- Do not describe rank 1 as a proven safest route.

The frontend should not assume that the model has been
validated for live traffic, road closures, or real-time
landslide conditions.

---

## 8. Prototype status

The following validations have been completed:

- Delay-factor model training.
- Single-route inference.
- Multi-route inference.
- Feature schema validation.
- ETA reconstruction validation.
- Geometry coverage validation.
- Route rank validation.
- JSON reload validation.
- Robustness diagnostics on the candidate dataset.

The next development phase should focus on genuine
historical ETA labels, broader route coverage, and
validation against real-world observations.
