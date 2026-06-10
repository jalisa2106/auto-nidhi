import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ==========================================================
# CONFIG
# ==========================================================

TARGET_COLUMN = "ml_recommendation"

TEST_SIZE = 0.20
RANDOM_STATE = 42

# ==========================================================
# SPLIT DATA
# ==========================================================

def split_data(dataset_path, output_dir):

    print("\n========== DATA SPLITTING STARTED ==========\n")

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
                f"Target column '{TARGET_COLUMN}' not found."
            )

        # --------------------------------------------------
        # ENCODE FEATURES
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
            f"\nEncoding {len(categorical_columns)} categorical column(s)..."
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

        print("\nTarget Mapping:")

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
        # SAVE OUTPUTS
        # --------------------------------------------------

        os.makedirs(
            output_dir,
            exist_ok=True
        )

        X_train.to_csv(
            os.path.join(
                output_dir,
                "X_train.csv"
            ),
            index=False
        )

        X_test.to_csv(
            os.path.join(
                output_dir,
                "X_test.csv"
            ),
            index=False
        )

        pd.DataFrame(
            y_train,
            columns=[TARGET_COLUMN]
        ).to_csv(
            os.path.join(
                output_dir,
                "y_train.csv"
            ),
            index=False
        )

        pd.DataFrame(
            y_test,
            columns=[TARGET_COLUMN]
        ).to_csv(
            os.path.join(
                output_dir,
                "y_test.csv"
            ),
            index=False
        )

        joblib.dump(
            feature_encoders,
            os.path.join(
                output_dir,
                "feature_encoders.pkl"
            )
        )

        joblib.dump(
            target_encoder,
            os.path.join(
                output_dir,
                "target_encoder.pkl"
            )
        )

        print(
            f"\nFiles saved successfully to:\n{output_dir}"
        )

        print(
            "\n========== DATA SPLITTING COMPLETED ==========\n"
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

    output_dir = os.path.join(
        script_dir,
        "data_splits"
    )

    split_data(
        dataset_path,
        output_dir
    )