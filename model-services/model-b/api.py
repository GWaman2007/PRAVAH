#!/usr/bin/env python3
"""
PRAVAH Model B - Flask Microservice
Exposes REST endpoints for Model B Route Delay-Factor Inference (Port 5006).
"""

import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "inference"))
from predict_model_b import predict_model_b, predict_model_b_multi, MODEL_VERSION, MIN_DELAY_FACTOR, MAX_DELAY_FACTOR

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "pravah-model-b",
        "engine": "random_forest_regressor_joblib",
        "model_version": MODEL_VERSION,
        "features_count": 21,
        "bounds": {
            "minimum": MIN_DELAY_FACTOR,
            "maximum": MAX_DELAY_FACTOR,
        }
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No JSON payload provided"}), 400

        features = data.get("features", data)
        result = predict_model_b(features)
        return jsonify(result)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal inference error: {str(e)}"}), 500


@app.route("/multi_predict", methods=["POST"])
def multi_predict():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No JSON payload provided"}), 400

        routes = data.get("routes", data)
        if not isinstance(routes, list):
            return jsonify({"error": "'routes' must be an array of candidate route objects"}), 400

        results = predict_model_b_multi(routes)
        return jsonify({"status": "success", "results": results})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal multi-inference error: {str(e)}"}), 500


if __name__ == "__main__":
    port = 5006
    print(f"[Model B Microservice] Starting on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
