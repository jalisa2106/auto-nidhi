import os
import pandas as pd

from rules import calculate_risk_score


# ==========================================================
# CONFIG
# ==========================================================

DROP_COLUMNS = [
    "customer_name",
    "email",
    "mobile_1",
    "mobile_2",
    "aadhar_number",
    "pan_number",
    "address",
    "remarks",
    "cheque_no",
    "cheque_date",
    "created_by_user_id",
    "is_deleted",
    "date_of_birth"
]


# ==========================================================
# CUSTOMER TENURE
# ==========================================================

def create_customer_tenure(df):
    """
    Creates customer_tenure_months
    using created_at_cust timestamp.
    """

    if "created_at_cust" not in df.columns:
        print(
            "WARNING: created_at_cust not found. "
            "Skipping customer tenure creation."
        )
        return df

    current_timestamp = pd.Timestamp.now().timestamp()

    tenure_days = (
        current_timestamp - df["created_at_cust"]
    ) / (60 * 60 * 24)

    df["customer_tenure_months"] = (
        tenure_days / 30
    ).fillna(0).astype(int)

    print("Created: customer_tenure_months")

    return df


# ==========================================================
# RISK SCORE
# ==========================================================

def create_risk_score(df):

    required_columns = [
        "loan_amount",
        "emi_amount",
        "active_overdue_amount",
        "overdue_emi_count"
    ]

    missing_columns = [
        col
        for col in required_columns
        if col not in df.columns
    ]

    if missing_columns:

        print(
            f"WARNING: Missing columns for risk score: "
            f"{missing_columns}"
        )

        df["risk_score"] = 0

        return df

    df["risk_score"] = df.apply(
        lambda row: calculate_risk_score(
            loan_amount=row["loan_amount"],
            emi_amount=row["emi_amount"],
            active_overdue_amount=row["active_overdue_amount"],
            overdue_emi_count=row["overdue_emi_count"]
        ),
        axis=1
    )

    print("Created: risk_score")

    return df


# ==========================================================
# LOAN BURDEN SCORE
# ==========================================================

def create_loan_burden_score(df):

    if (
        "loan_amount" not in df.columns
        or "emi_amount" not in df.columns
    ):
        print(
            "WARNING: loan_amount or emi_amount not found."
        )

        df["loan_burden_score"] = 0

        return df

    df["loan_burden_score"] = (
        df["emi_amount"]
        /
        df["loan_amount"].replace(0, 1)
    )

    print("Created: loan_burden_score")

    return df


# ==========================================================
# OVERDUE SEVERITY
# ==========================================================

def create_overdue_severity(df):

    if (
        "active_overdue_amount" not in df.columns
        or "overdue_emi_count" not in df.columns
    ):
        print(
            "WARNING: overdue columns not found."
        )

        df["overdue_severity"] = 0

        return df

    df["overdue_severity"] = (
        df["active_overdue_amount"]
        *
        df["overdue_emi_count"]
    )

    print("Created: overdue_severity")

    return df


# ==========================================================
# FEATURE ENGINEERING PIPELINE
# ==========================================================

def feature_engineering(input_path, output_dir):

    print(
        "\n========== FEATURE ENGINEERING STARTED ==========\n"
    )

    try:

        # --------------------------------------------------
        # Load Dataset
        # --------------------------------------------------

        if not os.path.exists(input_path):
            raise FileNotFoundError(
                f"Dataset not found: {input_path}"
            )

        print(f"Loading dataset: {input_path}")

        original_df = pd.read_csv(input_path)

        # Work on copy only
        df = original_df.copy()

        print(f"Input Shape: {df.shape}")

        # --------------------------------------------------
        # Drop Columns
        # --------------------------------------------------

        columns_to_drop = [
            col
            for col in DROP_COLUMNS
            if col in df.columns
        ]

        df.drop(
            columns=columns_to_drop,
            inplace=True
        )

        print(
            f"Dropped {len(columns_to_drop)} column(s)"
        )

        # --------------------------------------------------
        # Customer Tenure
        # --------------------------------------------------

        df = create_customer_tenure(df)

        # --------------------------------------------------
        # Risk Score
        # --------------------------------------------------

        df = create_risk_score(df)

        # --------------------------------------------------
        # Loan Burden Score
        # --------------------------------------------------

        df = create_loan_burden_score(df)

        # --------------------------------------------------
        # Overdue Severity
        # --------------------------------------------------

        df = create_overdue_severity(df)

        # --------------------------------------------------
        # Save Dataset
        # --------------------------------------------------

        os.makedirs(output_dir, exist_ok=True)

        output_file = os.path.join(
            output_dir,
            "feature_engineered_dataset.csv"
        )

        df.to_csv(
            output_file,
            index=False
        )

        print(
            f"\nFeature dataset saved to:\n{output_file}"
        )

        print(
            f"Final Shape: {df.shape}"
        )

        print(
            "\n========== FEATURE ENGINEERING COMPLETED ==========\n"
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

    input_dataset = os.path.join(
        script_dir,
        "processed_data",
        "cleaned_dataset.csv"
    )

    output_directory = os.path.join(
        script_dir,
        "feature_data"
    )

    feature_engineering(
        input_dataset,
        output_directory
    )