import os
import json
import joblib
import pandas as pd

from sklearn.preprocessing import LabelEncoder

from pandas.api.types import (
is_numeric_dtype,
is_string_dtype,
is_object_dtype
)

TARGET_COLUMN = "ml_recommendation"
DEFAULT_TARGET_VALUE = "Needs Manual Review"

DEBUG = False

def preprocess_data(dataset_path, output_dir):
    print("\n========== PREPROCESSING STARTED ==========\n")

    try:

        # ==========================================================
        # 1. LOAD DATASET
        # ==========================================================

        print(f"Loading dataset: {dataset_path}")
        original_df = pd.read_csv(dataset_path)

        # Work on copy
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
            col
            for col in df.columns
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

            parsed_dates = parsed_dates.fillna(
                reference_date
            )

            df[col] = (
                parsed_dates -
                pd.Timestamp("1970-01-01")
            ) // pd.Timedelta("1s")

            df[col] = df[col].astype("float64")

        print(
            f"Converted {len(date_columns)} date column(s)."
        )

        # ==========================================================
        # 5. DEBUG COLUMN TYPES
        # ==========================================================

        if DEBUG:
            print("\nColumn Datatypes:")
            for col in df.columns:
                print(f"{col} --> {df[col].dtype}")

        # ==========================================================
        # 6. HANDLE MISSING VALUES
        # ==========================================================

        print("\nHandling missing values...")

        for col in df.columns:

            # Target column
            if col == TARGET_COLUMN:

                df[col] = df[col].fillna(
                    DEFAULT_TARGET_VALUE
                )

                continue

            # Text / Categorical
            if (
                is_object_dtype(df[col])
                or is_string_dtype(df[col])
            ):

                df[col] = (
                    df[col]
                    .fillna("Missing")
                    .astype(str)
                    .str.strip()
                )

            # Numeric
            elif is_numeric_dtype(df[col]):

                median_value = df[col].median()

                if pd.isna(median_value):
                    median_value = 0

                df[col] = df[col].fillna(
                    median_value
                )

            # Fallback
            else:

                df[col] = (
                    df[col]
                    .astype(str)
                    .fillna("Missing")
                )

        print("Missing value handling completed.")

        # ==========================================================
        # 7. SKIP FEATURE ENCODING
        # ==========================================================

        print(
            "\nSkipping feature encoding."
        )

        print(
            "Feature encoding will be handled "
            "inside feature_engineering.py"
        )

        # ==========================================================
        # 8. CREATE TARGET ENCODER
        # ==========================================================

        print("\nCreating target encoder...")

        target_encoder = LabelEncoder()

        target_encoder.fit(
            df[TARGET_COLUMN]
        )

        target_mapping = {
            int(index): label
            for index, label in enumerate(
                target_encoder.classes_
            )
        }

        print("\nTarget Mapping:")
        print(target_mapping)

        # ==========================================================
        # 9. SAVE OUTPUTS
        # ==========================================================

        os.makedirs(
            output_dir,
            exist_ok=True
        )

        cleaned_dataset_path = os.path.join(
            output_dir,
            "cleaned_dataset.csv"
        )

        df.to_csv(
            cleaned_dataset_path,
            index=False
        )

        # Save target encoder
        joblib.dump(
            target_encoder,
            os.path.join(
                output_dir,
                "target_encoder.pkl"
            )
        )

        # Save target mapping
        with open(
            os.path.join(
                output_dir,
                "target_mapping.json"
            ),
            "w"
        ) as f:

            json.dump(
                target_mapping,
                f,
                indent=4
            )

        # ==========================================================
        # 10. SUMMARY
        # ==========================================================

        print("\n========== SUMMARY ==========")

        print(
            f"Final Dataset Shape: {df.shape}"
        )

        print(
            f"Output Directory: {output_dir}"
        )

        print(
            "\nFiles Generated:"
        )

        print("1. cleaned_dataset.csv")
        print("2. target_encoder.pkl")
        print("3. target_mapping.json")

        print(
            "\n========== PREPROCESSING COMPLETED =========="
        )

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        raise


if __name__ == "__main__":

    script_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    dataset_path = os.path.join(
        script_dir,
        "dataset",
        "master_dataset_with_ml_recommendation.csv"
    )

    output_dir = os.path.join(
        script_dir,
        "processed_data"
    )

    preprocess_data(
        dataset_path,
        output_dir
    )