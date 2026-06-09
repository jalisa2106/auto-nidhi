import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

TARGET_COLUMN = "ml_recommendation"
DEFAULT_TARGET_VALUE = "Needs Manual Review"
RANDOM_STATE = 42
TEST_SIZE = 0.20

def preprocess_data(dataset_path, output_dir):
    print("\n========== PREPROCESSING STARTED ==========\n")

    try:
        # ==========================================================
        # 1. LOAD DATASET
        # ==========================================================
        print(f"Loading dataset: {dataset_path}")
        original_df = pd.read_csv(dataset_path)
        # Work on a copy only
        df = original_df.copy()
        print(f"Original Shape: {df.shape}")
        # ==========================================================
        # 2. VALIDATE DATASET
        # ==========================================================
        if TARGET_COLUMN not in df.columns:
            raise ValueError(
                f"Target column '{TARGET_COLUMN}' not found in dataset."
            )

        # ==========================================================
        # 3. REMOVE DUPLICATES
        # ==========================================================
        before_rows = len(df)
        df.drop_duplicates(inplace=True)
        removed_duplicates = before_rows - len(df)

        print(f"Removed Duplicates: {removed_duplicates}")
        print(f"Current Shape: {df.shape}")

        # ==========================================================
        # 4. CONVERT DATE COLUMNS
        # ==========================================================
        print("\nConverting date columns...")

        date_columns = [
            col for col in df.columns
            if (
                "date" in col.lower()
                or "created_at" in col.lower()
                or "updated_at" in col.lower()
            )
        ]

        for col in date_columns:

            parsed_dates = pd.to_datetime(
                df[col],
                errors="coerce"
            )

            reference_date = parsed_dates.min()

            if pd.isna(reference_date):
                reference_date = pd.Timestamp("2023-01-01")

            parsed_dates = parsed_dates.fillna(reference_date)

            df[col] = (
                parsed_dates -
                pd.Timestamp("1970-01-01")
            ) // pd.Timedelta("1s")

            df[col] = df[col].astype("float64")

        print(f"Converted {len(date_columns)} date column(s).")

        # ==========================================================
        # 5. HANDLE MISSING VALUES
        # ==========================================================
        print("\nHandling missing values...")

        for col in df.columns:

            # Target column
            if col == TARGET_COLUMN:
                df[col] = df[col].fillna(DEFAULT_TARGET_VALUE)
                continue

            # Categorical
            if df[col].dtype == "object":

                df[col] = (
                    df[col]
                    .fillna("Missing")
                    .astype(str)
                    .str.strip()
                )

            # Numeric
            else:

                median_value = df[col].median()

                if pd.isna(median_value):
                    median_value = 0

                df[col] = df[col].fillna(median_value)

        # ==========================================================
        # 6. ENCODE CATEGORICAL FEATURES
        # ==========================================================
        print("\nEncoding categorical columns...")

        feature_encoders = {}

        for col in df.columns:

            if col == TARGET_COLUMN:
                continue

            if df[col].dtype == "object":

                encoder = LabelEncoder()

                df[col] = encoder.fit_transform(
                    df[col].astype(str)
                )

                feature_encoders[col] = encoder

        print(
            f"Encoded {len(feature_encoders)} categorical column(s)."
        )

        # ==========================================================
        # 7. ENCODE TARGET
        # ==========================================================
        target_encoder = LabelEncoder()

        y = target_encoder.fit_transform(
            df[TARGET_COLUMN]
        )

        X = df.drop(columns=[TARGET_COLUMN])

        print("\nTarget Mapping:")

        target_mapping = {
            int(idx): label
            for idx, label in enumerate(
                target_encoder.classes_
            )
        }

        print(target_mapping)

        # ==========================================================
        # 8. TRAIN TEST SPLIT
        # ==========================================================
        print("\nCreating train/test split...")

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=y
        )

        # ==========================================================
        # 9. SAVE OUTPUTS
        # ==========================================================
        os.makedirs(output_dir, exist_ok=True)

        # Cleaned dataset for feature engineering
        df.to_csv(
            os.path.join(
                output_dir,
                "cleaned_dataset.csv"
            ),
            index=False
        )

        # Train/Test
        X_train.to_csv(
            os.path.join(output_dir, "X_train.csv"),
            index=False
        )

        X_test.to_csv(
            os.path.join(output_dir, "X_test.csv"),
            index=False
        )

        pd.DataFrame(
            y_train,
            columns=[TARGET_COLUMN]
        ).to_csv(
            os.path.join(output_dir, "y_train.csv"),
            index=False
        )

        pd.DataFrame(
            y_test,
            columns=[TARGET_COLUMN]
        ).to_csv(
            os.path.join(output_dir, "y_test.csv"),
            index=False
        )

        # Save encoders
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

        # ==========================================================
        # 10. SUMMARY
        # ==========================================================
        print("\n========== SUMMARY ==========")

        print(f"Train Shape: {X_train.shape}")
        print(f"Test Shape : {X_test.shape}")

        print(
            f"Files saved successfully to:\n{output_dir}"
        )

        print(
            "\n========== PREPROCESSING COMPLETED ==========\n"
        )

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        raise


if __name__ == "__main__":

    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir,"dataset","master_dataset_with_ml_recommendation.csv")
    output_dir = os.path.join(script_dir,"processed_data")
    preprocess_data(dataset_path,output_dir)