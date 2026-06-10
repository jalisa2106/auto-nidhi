import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
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
TEST_SIZE = 0.20

# ==========================================================

# TRAIN XGBOOST

# ==========================================================

def train_xgboost(dataset_path, model_dir):

    print("\n========== XGBOOST TRAINING STARTED ==========\n")

    try:

        # --------------------------------------------------
        # LOAD DATASET
        # --------------------------------------------------

        if not os.path.exists(dataset_path):
            raise FileNotFoundError(
                f"Dataset not found: {dataset_path}"
            )

        print(f"Loading dataset: {dataset_path}")

        df = pd.read_csv(dataset_path)

        print(f"Dataset Shape: {df.shape}")

        # --------------------------------------------------
        # VALIDATE TARGET
        # --------------------------------------------------

        if TARGET_COLUMN not in df.columns:
            raise ValueError(
                f"{TARGET_COLUMN} not found"
            )

        # --------------------------------------------------
        # ENCODE CATEGORICAL FEATURES
        # --------------------------------------------------

        feature_encoders = {}

        categorical_columns = df.select_dtypes(
            include=["object"]
        ).columns.tolist()

        if TARGET_COLUMN in categorical_columns:
            categorical_columns.remove(
                TARGET_COLUMN
            )

        print(
            f"Encoding {len(categorical_columns)} categorical columns..."
        )

        for col in categorical_columns:

            encoder = LabelEncoder()

            df[col] = encoder.fit_transform(
                df[col].astype(str)
            )

            feature_encoders[col] = encoder

        # --------------------------------------------------
        # ENCODE TARGET
        # --------------------------------------------------

        target_encoder = LabelEncoder()

        y = target_encoder.fit_transform(
            df[TARGET_COLUMN]
        )

        X = df.drop(
            columns=[TARGET_COLUMN]
        )

        print("\nTarget Classes:")

        for idx, label in enumerate(
            target_encoder.classes_
        ):
            print(f"{idx} -> {label}")

        # --------------------------------------------------
        # TRAIN TEST SPLIT
        # --------------------------------------------------

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=y
        )

        print(
            f"\nTrain Shape: {X_train.shape}"
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

        print("\nClassification Report:\n")

        print(
            classification_report(
                y_test,
                predictions,
                target_names=target_encoder.classes_
            )
        )

        print("\nConfusion Matrix:\n")

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

        joblib.dump(
            model,
            os.path.join(
                model_dir,
                "xgboost_model.pkl"
            )
        )

        joblib.dump(
            feature_encoders,
            os.path.join(
                model_dir,
                "xgboost_feature_encoders.pkl"
            )
        )

        joblib.dump(
            target_encoder,
            os.path.join(
                model_dir,
                "xgboost_target_encoder.pkl"
            )
        )

        print(
            "\nModel saved successfully."
        )

        print(
            "\n========== XGBOOST TRAINING COMPLETED ==========\n"
        )

    except Exception as e:

        print(f"\nERROR: {str(e)}")
        raise

# ==========================================================

# MAIN

# ==========================================================

if __name__ == "__main__":

    script_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    dataset_path = os.path.join(
        script_dir,
        "feature_data",
        "feature_engineered_dataset.csv"
    )

    model_dir = os.path.join(
        script_dir,
        "models"
    )

    train_xgboost(
        dataset_path,
        model_dir
    )