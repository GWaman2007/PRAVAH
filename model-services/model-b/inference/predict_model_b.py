#!/usr/bin/env python3
"""
PRAVAH Model B - Prototype Route Delay-Factor Regressor Inference
Loads trained Random Forest regressor (model_b_delay_factor_regressor.joblib),
validates exact 21 features, clamps delay factor to [1.0, 1.75],
and reconstructs predicted ETA: predicted_eta_minutes = osrm_duration_minutes * predicted_delay_factor.
"""

import sys
import json
import warnings
from pathlib import Path

# Suppress sklearn unpickle version warnings
warnings.filterwarnings("ignore", category=UserWarning)

import joblib
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "model" / "model_b_delay_factor_regressor.joblib"
SCHEMA_PATH = BASE_DIR / "model" / "model_b_delay_factor_schema.json"

MIN_DELAY_FACTOR = 1.0
MAX_DELAY_FACTOR = 1.75
MODEL_VERSION = "prototype_v2_delay_factor"

_cached_model = None
_cached_features = None


def load_model(model_path=None):
    global _cached_model
    if _cached_model is None:
        path = model_path or MODEL_PATH
        _cached_model = joblib.load(str(path))
    return _cached_model


def load_schema(schema_path=None):
    global _cached_features
    if _cached_features is None:
        path = schema_path or SCHEMA_PATH
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        _cached_features = data.get("features", [])
    return _cached_features


def predict_model_b(features_dict, model_path=None, schema_path=None):
    """
    Run inference for a single route candidate.

    Parameters
    ----------
    features_dict : dict
        Must contain all 21 required features from model_b_delay_factor_schema.json.

    Returns
    -------
    dict:
        raw_delay_factor: float
        predicted_delay_factor: float (clamped to [1.0, 1.75])
        osrm_duration_minutes: float
        predicted_eta_minutes: float
        eta_overhead_minutes: float
        model_version: str
    """
    feature_names = load_schema(schema_path)
    model = load_model(model_path)

    missing = [feat for feat in feature_names if feat not in features_dict]
    if missing:
        raise ValueError(f"Missing required Model B features: {', '.join(missing)}")

    # Strict numeric validation and ordering
    row = []
    for feat in feature_names:
        val = features_dict[feat]
        if val is None or not isinstance(val, (int, float, np.number)):
            try:
                val = float(val)
            except (ValueError, TypeError):
                raise ValueError(f"Feature '{feat}' must be a valid numeric value, got: {val}")
        row.append(float(val))

    df = pd.DataFrame([row], columns=feature_names)
    raw_delay = float(model.predict(df)[0])

    # Enforce hard bounds [1.0, 1.75]
    clamped_delay = max(MIN_DELAY_FACTOR, min(MAX_DELAY_FACTOR, raw_delay))

    osrm_dur = float(features_dict.get("osrm_duration_minutes", 0.0))
    predicted_eta = osrm_dur * clamped_delay
    overhead = predicted_eta - osrm_dur

    return {
        "raw_delay_factor": raw_delay,
        "predicted_delay_factor": clamped_delay,
        "osrm_duration_minutes": osrm_dur,
        "predicted_eta_minutes": predicted_eta,
        "eta_overhead_minutes": max(0.0, overhead),
        "model_version": MODEL_VERSION,
        "clamped": raw_delay != clamped_delay,
    }


def predict_model_b_multi(routes_list, model_path=None, schema_path=None):
    """
    Run inference for multiple candidate routes and rank them by ascending predicted_eta_minutes.
    """
    results = []
    for idx, route_data in enumerate(routes_list):
        features = route_data.get("features", route_data)
        route_id = route_data.get("route_id", f"candidate_{idx + 1}")
        route_number = route_data.get("route_number", idx + 1)
        
        pred = predict_model_b(features, model_path, schema_path)
        pred["route_id"] = route_id
        pred["route_number"] = route_number
        pred["distance_km"] = float(features.get("distance_km", 0.0))
        results.append(pred)

    # Sort ascending by predicted_eta_minutes
    results.sort(key=lambda r: r["predicted_eta_minutes"])

    for rank_idx, res in enumerate(results):
        res["predicted_route_rank"] = rank_idx + 1
        res["predicted_preferred_route"] = (rank_idx == 0)

    return results


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: predict_model_b.py <input.json> [--multi]"}))
        sys.exit(1)

    input_path = Path(sys.argv[1])
    is_multi = "--multi" in sys.argv

    if not input_path.exists():
        print(json.dumps({"error": f"Input file not found: {input_path}"}))
        sys.exit(1)

    try:
        with open(input_path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        if is_multi or isinstance(payload, list) or "routes" in payload:
            routes = payload.get("routes", payload) if isinstance(payload, dict) else payload
            res = predict_model_b_multi(routes)
            print(json.dumps({"status": "success", "results": res}, indent=2))
        else:
            features = payload.get("features", payload)
            res = predict_model_b(features)
            print(json.dumps(res, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
