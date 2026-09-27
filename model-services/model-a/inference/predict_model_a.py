from pathlib import Path
import pandas as pd
import xgboost as xgb


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "model" / "pravah_model_a_baseline_xgb.json"
SCHEMA_PATH = BASE_DIR / "model" / "pravah_model_a_frozen_feature_schema.csv"

THRESHOLD = 0.50


def load_model(model_path=None):
    """Load the frozen PRAVAH Model A XGBoost classifier."""
    path = model_path or MODEL_PATH
    model = xgb.XGBClassifier()
    model.load_model(str(path))
    return model


def load_feature_schema(schema_path=None):
    """Load the frozen Model A feature schema."""
    path = schema_path or SCHEMA_PATH
    schema = pd.read_csv(path)

    if "feature_name" in schema.columns:
        return schema["feature_name"].tolist()

    if "feature" in schema.columns:
        return schema["feature"].tolist()

    # Fallback to text column avoiding index/order column
    for col in schema.columns:
        if col != "feature_order" and schema[col].dtype == object:
            return schema[col].tolist()

    return schema.iloc[:, -1].tolist()


def predict_model_a(observation, threshold=THRESHOLD, model_path=None, schema_path=None):
    """
    Run PRAVAH Model A inference.

    Parameters
    ----------
    observation : dict
        Dictionary containing all 17 required Model A features.

    threshold : float
        Classification threshold. Default = 0.50.

    model_path : str or Path, optional
        Path to XGBoost model file.

    schema_path : str or Path, optional
        Path to feature schema CSV.

    Returns
    -------
    dict
        event_probability
        prediction
        threshold
        interpretation
    """

    feature_schema = load_feature_schema(schema_path)

    if "features" in observation and isinstance(observation["features"], dict):
        observation = observation["features"]

    missing = [
        feature
        for feature in feature_schema
        if feature not in observation
    ]

    if missing:
        raise ValueError(
            f"Missing required Model A features: {missing}"
        )

    # Keep ONLY the frozen features and preserve their order
    input_data = {
        feature: observation[feature]
        for feature in feature_schema
    }

    try:
        df = pd.DataFrame([input_data], columns=feature_schema)

        for feature in feature_schema:
            df[feature] = pd.to_numeric(
                df[feature],
                errors="raise"
            )

    except Exception as exc:
        raise ValueError(
            f"Invalid feature value: {exc}"
        )

    if df.isnull().any().any():
        missing_values = df.columns[df.isnull().any()].tolist()
        raise ValueError(
            f"Missing/NaN values found in: {missing_values}"
        )

    model = load_model(model_path)

    probability = float(
        model.predict_proba(df)[0][1]
    )

    prediction = int(
        probability >= threshold
    )

    if prediction == 1:
        interpretation = (
            "Elevated likelihood of a documented road-associated "
            "event within the prediction horizon."
        )
    else:
        interpretation = (
            "Lower likelihood of a documented road-associated "
            "event within the prediction horizon."
        )

    return {
        "event_probability": probability,
        "prediction": prediction,
        "threshold": threshold,
        "interpretation": interpretation
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="PRAVAH Model A Inference CLI")
    parser.add_argument("--model", type=str, default=None, help="Path to model JSON")
    parser.add_argument("--schema", type=str, default=None, help="Path to schema CSV")
    parser.add_argument("--input", type=str, default=None, help="Path to input JSON")
    parser.add_argument("--threshold", type=float, default=THRESHOLD, help="Classification threshold")
    args = parser.parse_args()

    if args.input:
        with open(args.input, "r") as f:
            observation = json.load(f)
    else:
        observation = {
            "rainfall_24h": 85.7,
            "rainfall_72h": 163.2,
            "rainfall_7d": 210.5,
            "elevation_m": 196.8,
            "slope_degrees": 31.6,
            "historical_road_landslide_count": 6,
            "historical_road_landslide_presence": 1,
            "bt_road_km": 125.4,
            "icbp_km": 42.1,
            "cement_concrete_km": 18.2,
            "paver_block_km": 5.3,
            "total_paved_road_km": 191.0,
            "bt_road_ratio": 0.65,
            "icbp_ratio": 0.22,
            "cement_concrete_ratio": 0.095,
            "paver_block_ratio": 0.028,
            "road_surface_diversity": 0.71
        }

    result = predict_model_a(
        observation,
        threshold=args.threshold,
        model_path=args.model,
        schema_path=args.schema
    )

    print(json.dumps(result))

