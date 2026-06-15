"""
predict.py
==========
Real-time inference: given raw advance request data,
return a recommendation + confidence score.

Used by:
  - CLI testing (run directly)
  - FastAPI backend route (import predict_advance)

Reads  : models/best_model.pkl
         processed_data/feature_encoders.pkl
         processed_data/target_encoder.pkl
"""

import os
import json
import joblib
import numpy as np
import pandas as pd


# ==========================================================
# PATHS
# ==========================================================

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(SCRIPT_DIR, "processed_data")
MODELS_DIR    = os.path.join(SCRIPT_DIR, "models")

MODEL_PATH    = os.path.join(MODELS_DIR, "best_model.pkl")
FEAT_ENC_PATH = os.path.join(PROCESSED_DIR, "feature_encoders.pkl")
if not os.path.exists(FEAT_ENC_PATH):
    FEAT_ENC_PATH = os.path.join(SCRIPT_DIR, "data_splits", "feature_encoders.pkl")
if not os.path.exists(FEAT_ENC_PATH):
    FEAT_ENC_PATH = os.path.join(MODELS_DIR, "rf_feature_encoders.pkl")
TGT_ENC_PATH  = os.path.join(PROCESSED_DIR, "target_encoder.pkl")
META_PATH     = os.path.join(MODELS_DIR, "model_metadata.json")


# ==========================================================
# LOAD (cached at module level — loads once)
# ==========================================================

_model          = None
_feat_encoders  = None
_target_encoder = None
_feature_names  = None   # exact column order the model was trained on


def _load_artifacts():
    global _model, _feat_encoders, _target_encoder, _feature_names

    if _model is not None:
        return  # already loaded

    for path, name in [
        (MODEL_PATH,    "best_model.pkl"),
        (FEAT_ENC_PATH, "feature_encoders.pkl"),
        (TGT_ENC_PATH,  "target_encoder.pkl"),
    ]:
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"{name} not found at {path}\n"
                "Run train.py first."
            )

    _model          = joblib.load(MODEL_PATH)
    _feat_encoders  = joblib.load(FEAT_ENC_PATH)
    _target_encoder = joblib.load(TGT_ENC_PATH)

    # Recover feature names from the model itself
    _feature_names = _model.feature_names_in_.tolist()


# ==========================================================
# CORE FUNCTION
# ==========================================================

def predict_advance(raw_input: dict) -> dict:
    """
    Parameters
    ----------
    raw_input : dict
        Key-value pairs matching the columns used during training.
        Example:
            {
                "loan_amount"          : 850000,
                "emi_amount"           : 18000,
                "active_overdue_amount": 5000,
                "overdue_emi_count"    : 0,
                "file_type"            : "New Vehicle",
                "file_status"          : "Disbursed",
                "advance_amount"       : 30000,
                ...
            }

    Returns
    -------
    dict
        {
          "recommendation": "Likely Approved" | "Needs Manual Review"
                            | "High Risk / Likely Rejected",
          "confidence"    : 87.4,          # percentage (0–100)
          "risk_class"    : 1,             # 0=High Risk, 1=Approved, 2=Manual
          "all_probabilities": {
              "High Risk / Likely Rejected": 5.2,
              "Likely Approved"            : 87.4,
              "Needs Manual Review"        : 7.4,
          }
        }
    """
    _load_artifacts()

    # ----------------------------------------------------------
    # 1. Build a DataFrame with the correct column order
    # ----------------------------------------------------------
    df = pd.DataFrame([raw_input])

    # Add any columns the model expects but the caller didn't provide
    for col in _feature_names:
        if col not in df.columns:
            df[col] = 0   # safe numeric default

    # Drop any extra columns the caller may have provided
    df = df[[c for c in _feature_names if c in df.columns]]

    # ----------------------------------------------------------
    # 2. Encode categorical columns the same way as training
    # ----------------------------------------------------------
    for col, encoder in _feat_encoders.items():
        if col not in df.columns:
            continue
        val = str(df[col].iloc[0]).strip()
        if val in encoder.classes_:
            df[col] = encoder.transform([val])
        else:
            # Unknown category → use most common encoded value (0)
            df[col] = 0

    # ----------------------------------------------------------
    # 3. Ensure numeric types
    # ----------------------------------------------------------
    df = df.apply(pd.to_numeric, errors="coerce").fillna(0)

    # ----------------------------------------------------------
    # 4. Predict
    # ----------------------------------------------------------
    pred_class = int(_model.predict(df)[0])
    probabilities = _model.predict_proba(df)[0]   # array of 3 probs

    recommendation = _target_encoder.inverse_transform([pred_class])[0]
    confidence     = round(float(probabilities[pred_class]) * 100, 1)

    all_probs = {
        cls: round(float(prob) * 100, 1)
        for cls, prob in zip(
            _target_encoder.classes_, probabilities
        )
    }

    return {
        "recommendation"   : recommendation,
        "confidence"        : confidence,
        "risk_class"        : pred_class,
        "all_probabilities" : all_probs,
    }


# ==========================================================
# CLI DEMO — run `python predict.py` to test
# ==========================================================

if __name__ == "__main__":

    print("\n========== ADVANCE APPROVAL PREDICTOR ==========\n")

    test_cases = [
        {
            "_label"               : "LOW RISK customer",
            "loan_amount"          : 500000,
            "emi_amount"           : 10000,
            "active_overdue_amount": 0,
            "overdue_emi_count"    : 0,
            "advance_amount"       : 20000,
            "file_type"            : "New Vehicle",
            "file_status"          : "Disbursed",
        },
        {
            "_label"               : "MEDIUM RISK customer",
            "loan_amount"          : 900000,
            "emi_amount"           : 22000,
            "active_overdue_amount": 25000,
            "overdue_emi_count"    : 2,
            "advance_amount"       : 50000,
            "file_type"            : "Used Vehicle",
            "file_status"          : "Under Process",
        },
        {
            "_label"               : "HIGH RISK customer",
            "loan_amount"          : 1500000,
            "emi_amount"           : 38000,
            "active_overdue_amount": 80000,
            "overdue_emi_count"    : 5,
            "advance_amount"       : 150000,
            "file_type"            : "Renewal",
            "file_status"          : "Login",
        },
    ]

    for case in test_cases:
        label = case.pop("_label")
        result = predict_advance(case)

        ICONS = {
            "Likely Approved"            : "[APPROVED]",
            "Needs Manual Review"        : "[REVIEW]  ",
            "High Risk / Likely Rejected": "[REJECTED]",
        }
        icon = ICONS.get(result["recommendation"], "•")

        print(f"  [{label}]")
        print(f"  {icon}  {result['recommendation']}")
        print(f"     Confidence : {result['confidence']}%")
        print(f"     All Scores : {result['all_probabilities']}")
        print()

    print("========== DEMO COMPLETE ==========\n")
