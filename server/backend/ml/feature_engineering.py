import os
import pandas as pd

from rules import calculate_risk_score


# ==========================================================
# CONFIG
# ==========================================================

DROP_COLUMNS = [
    "full_name",
    "email",
    "mobile_1",
    "mobile_2",
    "address",
    "aadhar_number",
    "pan_number",
    "remarks",
    "remarks_payment_in",
    "remarks_payment_out",
    "remarks_advances",

    "cheque_no",
    "cheque_date",
    "cheque_no_payment_out",
    "cheque_date_payment_out",

    "date_of_birth",

    "created_by_user_id",
    "created_by",
    "created_by_advances",

    "is_deleted",
    "is_deleted_advances"
]


# ==========================================================
# CUSTOMER TENURE
# ==========================================================

def create_customer_tenure(df):
    """
    Creates customer_tenure_months
    using created_at_customer timestamp.
    """

    if "created_at_customer" not in df.columns:
        print(
            "WARNING: created_at_customer not found. "
            "Skipping customer tenure creation."
        )
        return df

    current_timestamp = pd.Timestamp.now().timestamp()

    tenure_days = (
        current_timestamp - df["created_at_customer"]
    ) / (60 * 60 * 24)

    df["customer_tenure_months"] = (
        tenure_days / 30
    ).clip(lower=0).fillna(0).astype(int)

    print("Created: customer_tenure_months")

    return df


# ==========================================================
# RISK SCORE
# ==========================================================

def create_risk_score(df):

    required_columns = [
        "loan_amount",
        "emi_amount",
        "remaining_amount",
        "amount_recovered",
        "old_loan_amount"
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
            remaining_amount=row["remaining_amount"],
            amount_recovered=row["amount_recovered"],
            old_loan_amount=row["old_loan_amount"]
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
# ADVANCE RATIO
# ==========================================================

def create_advance_ratio(df):

    if (
        "amount_advances" not in df.columns
        or "loan_amount" not in df.columns
    ):
        df["advance_ratio"] = 0
        return df

    df["advance_ratio"] = (
        df["amount_advances"]
        /
        df["loan_amount"].replace(0, 1)
    )

    print("Created: advance_ratio")

    return df

# ==========================================================
# OVERDUE SEVERITY
# ==========================================================

def create_overdue_severity(df):

    if (
        "remaining_amount" not in df.columns
        or "emi_amount" not in df.columns
    ):
        print(
            "WARNING: required columns not found."
        )

        df["overdue_severity"] = 0

        return df

    df["overdue_severity"] = (
        df["remaining_amount"]
        /
        df["emi_amount"].replace(0, 1)
    )

    print("Created: overdue_severity")

    return df

# ==========================================================
# RECOVERY PERCENTAGE
# ==========================================================

def create_recovery_percentage(df):

    if (
        "amount_recovered" not in df.columns
        or "amount_advances" not in df.columns
    ):
        df["recovery_percentage"] = 0
        return df

    df["recovery_percentage"] = (
        df["amount_recovered"]
        /
        df["amount_advances"].replace(0, 1)
    ) * 100

    df["recovery_percentage"] = (
        df["recovery_percentage"]
        .clip(lower=0, upper=100)
    )

    print("Created: recovery_percentage")

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
        # Advance Ratio
        # --------------------------------------------------

        df = create_advance_ratio(df)
        # --------------------------------------------------
        # Overdue Severity
        # --------------------------------------------------

        df = create_overdue_severity(df)

        # -------------------------------------------------- 
        # Recovery Percentage
        # --------------------------------------------------

        df = create_recovery_percentage(df)

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