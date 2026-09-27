import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from flask import Flask, request, jsonify

# Add inference directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR / "inference"))

from predict_model_a import predict_model_a, load_feature_schema, THRESHOLD

app = Flask(__name__)
MODEL_VERSION = "3.4.1-baseline-xgb"

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint exposing model version and schema confirmation."""
    schema = load_feature_schema()
    return jsonify({
        "status": "healthy",
        "service": "pravah-model-a",
        "model_version": MODEL_VERSION,
        "features_count": len(schema),
        "threshold": THRESHOLD,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    """Single segment disruption risk prediction."""
    if request.method == "OPTIONS":
        return "", 204

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Malformed or empty JSON payload"}), 400

    segment_id = payload.get("segment_id", "UNKNOWN_SEGMENT")
    prediction_time = payload.get("prediction_time", datetime.now(timezone.utc).isoformat())
    horizon_time = payload.get("horizon_time", "")
    features = payload.get("features", {})
    threshold = float(payload.get("threshold", THRESHOLD))

    if not isinstance(features, dict):
        return jsonify({"error": "Invalid features format. Must be an object with 17 features."}), 400

    try:
        raw_result = predict_model_a(features, threshold=threshold)
        
        prob = raw_result["event_probability"]
        # Derive display band convention (LOW, MODERATE, ELEVATED, HIGH)
        if prob < 0.30:
            risk_band = "LOW"
        elif prob < 0.60:
            risk_band = "MODERATE"
        elif prob < 0.80:
            risk_band = "ELEVATED"
        else:
            risk_band = "HIGH"

        response_data = {
            "segment_id": segment_id,
            "probability": prob,
            "prediction": raw_result["prediction"],
            "threshold": raw_result["threshold"],
            "risk_band": risk_band,
            "interpretation": raw_result["interpretation"],
            "model_version": MODEL_VERSION,
            "prediction_time": prediction_time,
            "horizon_time": horizon_time,
            "feature_snapshot": features,
            "source": "MODEL_A_INFERENCE"
        }
        return jsonify(response_data), 200

    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 422
    except Exception as exc:
        return jsonify({"error": f"Internal inference error: {str(exc)}"}), 500

@app.route("/batch_predict", methods=["POST", "OPTIONS"])
def batch_predict():
    """Batch prediction for multiple segments."""
    if request.method == "OPTIONS":
        return "", 204

    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, list):
        return jsonify({"error": "Payload must be a JSON array of segment requests"}), 400

    results = []
    for item in payload:
        segment_id = item.get("segment_id", "UNKNOWN_SEGMENT")
        prediction_time = item.get("prediction_time", datetime.now(timezone.utc).isoformat())
        horizon_time = item.get("horizon_time", "")
        features = item.get("features", {})
        threshold = float(item.get("threshold", THRESHOLD))

        try:
            raw_result = predict_model_a(features, threshold=threshold)
            prob = raw_result["event_probability"]
            if prob < 0.30:
                risk_band = "LOW"
            elif prob < 0.60:
                risk_band = "MODERATE"
            elif prob < 0.80:
                risk_band = "ELEVATED"
            else:
                risk_band = "HIGH"

            results.append({
                "segment_id": segment_id,
                "probability": prob,
                "prediction": raw_result["prediction"],
                "threshold": raw_result["threshold"],
                "risk_band": risk_band,
                "interpretation": raw_result["interpretation"],
                "model_version": MODEL_VERSION,
                "prediction_time": prediction_time,
                "horizon_time": horizon_time,
                "feature_snapshot": features,
                "source": "MODEL_A_INFERENCE"
            })
        except Exception as exc:
            results.append({
                "segment_id": segment_id,
                "error": str(exc),
                "probability": None,
                "prediction": None,
                "source": "MODEL_A_INFERENCE_ERROR"
            })

    return jsonify({"predictions": results}), 200

if __name__ == "__main__":
    port = int(os.environ.get("MODEL_A_PORT", 5005))
    print(f"Starting PRAVAH Model A Inference Microservice on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
