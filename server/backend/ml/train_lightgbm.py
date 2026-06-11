import os
import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from lightgbm import LGBMClassifier

# ==========================================================
# CONFIG
# ==========================================================

TARGET_COLUMN = "ml_recommendation"
RANDOM_STATE = 42

# ==========================================================
# PART 1: DATA PREPARATION
# ==========================================================

def load_and_prepare_data(data_dir):
    """
    Loads training and testing dataset splits along with the target encoder.
    Returns: X_train, X_test, y_train, y_test, target_encoder
    """
    print("Loading train/test datasets...")
    X_train_path = os.path.join(data_dir, "X_train.csv")
    X_test_path = os.path.join(data_dir, "X_test.csv")
    y_train_path = os.path.join(data_dir, "y_train.csv")
    y_test_path = os.path.join(data_dir, "y_test.csv")
    target_encoder_path = os.path.join(data_dir, "target_encoder.pkl")

    X_train = pd.read_csv(X_train_path)
    X_test = pd.read_csv(X_test_path)
    y_train = pd.read_csv(y_train_path)[TARGET_COLUMN]
    y_test = pd.read_csv(y_test_path)[TARGET_COLUMN]
    target_encoder = joblib.load(target_encoder_path)

    print(f"Train Shape: {X_train.shape}")
    print(f"Test Shape : {X_test.shape}")
    
    return X_train, X_test, y_train, y_test, target_encoder


# ==========================================================
# MAIN EXECUTION PIPELINE
# ==========================================================
if __name__ == "__main__":
    print("\n========== LIGHTGBM PIPELINE STARTED ==========\n")
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(script_dir, "data_splits")
        model_dir = os.path.join(script_dir, "models")

        X_train, X_test, y_train, y_test, target_encoder = load_and_prepare_data(data_dir)
        # train_and_evaluate_model(X_train, X_test, y_train, y_test, target_encoder, model_dir)

        print("\n========== LIGHTGBM PIPELINE COMPLETED ==========\n")

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        raise