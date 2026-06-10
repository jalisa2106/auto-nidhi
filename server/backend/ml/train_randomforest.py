"""
train_randomforest.py
=====================
Phase 3: Train Random Forest Classifier on feature-engineered data.

Pipeline:
  1. Load pre-existing data splits from data_splits/
  2. Train final model on full train set
  3. Save model + encoders + split data to models/

Run:
  python train_randomforest.py
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score


# ==========================================================
# CONFIG
# ==========================================================

TARGET_COLUMN = "ml_recommendation"
RANDOM_STATE  = 42
N_ESTIMATORS  = 200
CV_FOLDS      = 5
N_JOBS        = -1   # use all CPU cores


# ==========================================================
# PATHS
# ==========================================================

SCRIPT_DIR      = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR      = os.path.join(SCRIPT_DIR, "models")
DATA_SPLITS_DIR = os.path.join(SCRIPT_DIR, "data_splits")

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

    # 1. Paths to pre-existing data splits
    x_train_split_path = os.path.join(DATA_SPLITS_DIR, "X_train.csv")
    x_test_split_path = os.path.join(DATA_SPLITS_DIR, "X_test.csv")
    y_train_split_path = os.path.join(DATA_SPLITS_DIR, "y_train.csv")
    y_test_split_path = os.path.join(DATA_SPLITS_DIR, "y_test.csv")
    target_encoder_split_path = os.path.join(DATA_SPLITS_DIR, "target_encoder.pkl")
    feature_encoders_split_path = os.path.join(DATA_SPLITS_DIR, "feature_encoders.pkl")

    # Check if files exist
    for path in [x_train_split_path, y_train_split_path, x_test_split_path, y_test_split_path, target_encoder_split_path, feature_encoders_split_path]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required split file not found: {path}. Run split_data.py first.")

    # 2. Load dataset splits
    print("Loading pre-existing data splits from data_splits/...")
    X_train = pd.read_csv(x_train_split_path)
    X_test = pd.read_csv(x_test_split_path)
    y_train = pd.read_csv(y_train_split_path)[TARGET_COLUMN].values
    y_test = pd.read_csv(y_test_split_path)[TARGET_COLUMN].values
    target_encoder = joblib.load(target_encoder_split_path)
    feature_encoders = joblib.load(feature_encoders_split_path)

    print(f"  Train features shape: {X_train.shape}")
    print(f"  Train target shape  : {y_train.shape}")
    print(f"  Test features shape : {X_test.shape}")
    print(f"  Test target shape   : {y_test.shape}")
    print(f"  Classes             : {list(target_encoder.classes_)}")

    class_dist = pd.Series(y_train).value_counts().sort_index()
    print("\n  Train Class Distribution:")
    for cls_idx, count in class_dist.items():
        cls_label = target_encoder.inverse_transform([cls_idx])[0]
        print(f"    {cls_label}: {count} samples")

    # 3. Cross-Validation
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

    # 4. Final Training on full training set
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

    # 5. Feature Importances (top 10)
    importances = pd.Series(
        model.feature_importances_,
        index=X_train.columns
    ).sort_values(ascending=False)

    print("\nTop 10 Most Important Features:")
    for feat, score in importances.head(10).items():
        print(f"  {feat:<45} {score:.4f}")

    # 6. Save everything
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
