import os
import joblib
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

from xgboost import XGBClassifier

# ==========================================================
# CONFIG
# ==========================================================

TARGET_COLUMN = "ml_recommendation"
RANDOM_STATE = 42

# ==========================================================
# TRAIN XGBOOST
# ==========================================================

def train_xgboost(data_dir, model_dir):

    print("\n========== XGBOOST TRAINING STARTED ==========\n")

    try:

        # --------------------------------------------------
        # LOAD TRAIN / TEST DATA
        # --------------------------------------------------

        X_train_path = os.path.join(
            data_dir,
            "X_train.csv"
        )

        X_test_path = os.path.join(
            data_dir,
            "X_test.csv"
        )

        y_train_path = os.path.join(
            data_dir,
            "y_train.csv"
        )

        y_test_path = os.path.join(
            data_dir,
            "y_test.csv"
        )

        target_encoder_path = os.path.join(
            data_dir,
            "target_encoder.pkl"
        )

        print("Loading train/test datasets...")

        X_train = pd.read_csv(X_train_path)
        X_test = pd.read_csv(X_test_path)

        y_train = pd.read_csv(
            y_train_path
        )[TARGET_COLUMN]

        y_test = pd.read_csv(
            y_test_path
        )[TARGET_COLUMN]

        target_encoder = joblib.load(
            target_encoder_path
        )

        print(
            f"Train Shape: {X_train.shape}"
        )

        print(
            f"Test Shape : {X_test.shape}"
        )

        # --------------------------------------------------
        # MODEL
        # --------------------------------------------------

        model = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="multi:softprob",
            eval_metric="mlogloss",
            random_state=RANDOM_STATE
        )

        print("\nTraining XGBoost...")

        model.fit(
            X_train,
            y_train
        )

        # --------------------------------------------------
        # EVALUATION
        # --------------------------------------------------

        predictions = model.predict(
            X_test
        )

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        print(
            f"\nAccuracy: {accuracy:.4f}"
        )

        print(
            "\nClassification Report:\n"
        )

        print(
            classification_report(
                y_test,
                predictions,
                target_names=target_encoder.classes_
            )
        )

        print(
            "\nConfusion Matrix:\n"
        )

        print(
            confusion_matrix(
                y_test,
                predictions
            )
        )

        # --------------------------------------------------
        # SAVE MODEL
        # --------------------------------------------------

        os.makedirs(
            model_dir,
            exist_ok=True
        )

        model_path = os.path.join(
            model_dir,
            "xgboost_model.pkl"
        )

        joblib.dump(
            model,
            model_path
        )

        print(
            f"\nModel saved to:\n{model_path}"
        )

        print(
            "\n========== XGBOOST TRAINING COMPLETED ==========\n"
        )

    except Exception as e:

        print(
            f"\nERROR: {str(e)}"
        )
        raise


# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":

    script_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    data_dir = os.path.join(
        script_dir,
        "data_splits"
    )

    model_dir = os.path.join(
        script_dir,
        "models"
    )

    train_xgboost(
        data_dir,
        model_dir
    )