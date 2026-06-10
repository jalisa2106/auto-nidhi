"""
train_randomforest.py
=====================
Phase 3: Train Random Forest Classifier on feature-engineered data.

Pipeline:
  1. Load feature_data/feature_engineered_dataset.csv
  2. Encode categorical columns with LabelEncoder
  3. Train/Test split (80/20, stratified)
  4. Cross-validation (5-fold)
  5. Train final model on full train set
  6. Save model + encoders + split data to models/

Run:
  python train_randomforest.py
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from pandas.api.types import is_object_dtype, is_string_dtype


# ==========================================================
# CONFIG
# ==========================================================

TARGET_COLUMN = "ml_recommendation"
RANDOM_STATE  = 42
TEST_SIZE     = 0.20
N_ESTIMATORS  = 200
CV_FOLDS      = 5
N_JOBS        = -1   # use all CPU cores


# ==========================================================
# PATHS
# ==========================================================

SCRIPT_DIR      = os.path.dirname(os.path.abspath(__file__))
FEATURE_DIR     = os.path.join(SCRIPT_DIR, "feature_data")
PROCESSED_DIR   = os.path.join(SCRIPT_DIR, "processed_data")
MODELS_DIR      = os.path.join(SCRIPT_DIR, "models")

INPUT_PATH      = os.path.join(FEATURE_DIR, "feature_engineered_dataset.csv")
TARGET_ENC_PATH = os.path.join(PROCESSED_DIR, "target_encoder.pkl")

MODEL_PATH      = os.path.join(MODELS_DIR, "rf_model.pkl")
FEAT_ENC_PATH   = os.path.join(MODELS_DIR, "rf_feature_encoders.pkl")
META_PATH       = os.path.join(MODELS_DIR, "rf_metadata.json")
X_TRAIN_PATH    = os.path.join(MODELS_DIR, "rf_X_train.csv")
X_TEST_PATH     = os.path.join(MODELS_DIR, "rf_X_test.csv")
Y_TRAIN_PATH    = os.path.join(MODELS_DIR, "rf_y_train.csv")
Y_TEST_PATH     = os.path.join(MODELS_DIR, "rf_y_test.csv")


# ==========================================================
# MAIN
# ==========================================================

def train():
    print("\n========== RANDOM FOREST TRAINING STARTED ==========\n")

    # ----------------------------------------------------------
    # 1. Load feature-engineered dataset
    # ----------------------------------------------------------
    if not os.path.exists(INPUT_PATH):
        raise FileNotFoundError(
            f"Feature dataset not found: {INPUT_PATH}\n"
            "Run feature_engineering.py first."
        )

    print(f"Loading: {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH)
    print(f"  Shape: {df.shape}")

    # ----------------------------------------------------------
    # 2. Validate target column
    # ----------------------------------------------------------
    if TARGET_COLUMN not in df.columns:
        raise ValueError(
            f"Target column '{TARGET_COLUMN}' not found in dataset."
        )

    # ----------------------------------------------------------
    # 3. Encode categorical feature columns
    # ----------------------------------------------------------
    print("\nEncoding categorical feature columns...")

    feature_encoders = {}
    df_encoded = df.copy()

    for col in df_encoded.columns:
        if col == TARGET_COLUMN:
            continue
        if is_object_dtype(df_encoded[col]) or is_string_dtype(df_encoded[col]):
            enc = LabelEncoder()
            df_encoded[col] = enc.fit_transform(
                df_encoded[col].astype(str)
            )
            feature_encoders[col] = enc

    print(f"  Encoded {len(feature_encoders)} categorical column(s).")

    # ----------------------------------------------------------
    # 4. Separate features (X) and target (y)
    # ----------------------------------------------------------
    # Load the already-fitted target encoder from preprocessing
    if not os.path.exists(TARGET_ENC_PATH):
        raise FileNotFoundError(
            f"Target encoder not found: {TARGET_ENC_PATH}\n"
            "Run preprocessing.py first."
        )

    target_encoder = joblib.load(TARGET_ENC_PATH)

    X = df_encoded.drop(columns=[TARGET_COLUMN])
    y = target_encoder.transform(df_encoded[TARGET_COLUMN])

    print(f"\n  Features : {X.shape[1]}")
    print(f"  Samples  : {X.shape[0]}")
    print(f"  Classes  : {list(target_encoder.classes_)}")

    class_dist = pd.Series(y).value_counts().sort_index()
    print("\n  Class Distribution:")
    for cls_idx, count in class_dist.items():
        cls_label = target_encoder.inverse_transform([cls_idx])[0]
        print(f"    {cls_label}: {count} samples")

    # ----------------------------------------------------------
    # 5. Train/Test split (stratified)
    # ----------------------------------------------------------
    print(f"\nSplitting data (80% train / 20% test, stratified)...")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    print(f"  Train : {X_train.shape[0]} samples")
    print(f"  Test  : {X_test.shape[0]} samples")

    # ----------------------------------------------------------
    # 6. Cross-Validation
    # ----------------------------------------------------------
    print(f"\nRunning {CV_FOLDS}-fold Cross-Validation...")

    cv_model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=None,
        random_state=RANDOM_STATE,
        n_jobs=N_JOBS,
        class_weight="balanced",
        min_samples_split=5,
        min_samples_leaf=2,
    )

    cv_scores = cross_val_score(
        cv_model, X_train, y_train,
        cv=CV_FOLDS,
        scoring="accuracy",
        n_jobs=N_JOBS
    )

    print(f"  CV Accuracy per fold : {[round(s, 4) for s in cv_scores]}")
    print(f"  Mean CV Accuracy     : {cv_scores.mean():.4f} ({cv_scores.mean()*100:.2f}%)")
    print(f"  Std Dev              : {cv_scores.std():.4f}")

    # ----------------------------------------------------------
    # 7. Final Training on full training set
    # ----------------------------------------------------------
    print("\nTraining final Random Forest on full train set...")

    model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=None,
        random_state=RANDOM_STATE,
        n_jobs=N_JOBS,
        class_weight="balanced",
        min_samples_split=5,
        min_samples_leaf=2,
    )
    model.fit(X_train, y_train)
    print("  Training complete.")

    # ----------------------------------------------------------
    # 8. Feature Importances (top 10)
    # ----------------------------------------------------------
    importances = pd.Series(
        model.feature_importances_,
        index=X_train.columns
    ).sort_values(ascending=False)

    print("\nTop 10 Most Important Features:")
    for feat, score in importances.head(10).items():
        print(f"  {feat:<45} {score:.4f}")

    # ----------------------------------------------------------
    # 9. Save everything
    # ----------------------------------------------------------
    os.makedirs(MODELS_DIR, exist_ok=True)

    joblib.dump(model,           MODEL_PATH)
    joblib.dump(feature_encoders, FEAT_ENC_PATH)

    X_train.to_csv(X_TRAIN_PATH, index=False)
    X_test.to_csv(X_TEST_PATH,  index=False)

    pd.DataFrame(y_train, columns=[TARGET_COLUMN]).to_csv(
        Y_TRAIN_PATH, index=False
    )
    pd.DataFrame(y_test, columns=[TARGET_COLUMN]).to_csv(
        Y_TEST_PATH, index=False
    )

    metadata = {
        "model"           : "RandomForestClassifier",
        "n_estimators"    : N_ESTIMATORS,
        "train_samples"   : int(X_train.shape[0]),
        "test_samples"    : int(X_test.shape[0]),
        "features"        : int(X_train.shape[1]),
        "cv_mean_accuracy": round(float(cv_scores.mean()), 4),
        "cv_std"          : round(float(cv_scores.std()), 4),
        "top_10_features" : importances.head(10).index.tolist(),
    }
    with open(META_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved model     -> {MODEL_PATH}")
    print(f"Saved encoders  -> {FEAT_ENC_PATH}")
    print(f"Saved metadata  -> {META_PATH}")
    print(f"Saved train/test split -> {MODELS_DIR}")

    print("\n========== TRAINING COMPLETED ==========")
    print("Next step -> run: python evaluate.py")


if __name__ == "__main__":
    train()
