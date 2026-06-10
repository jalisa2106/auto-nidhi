"""
evaluate.py
===========
Phase 4: Evaluate the trained Random Forest on unseen test data.

Reads  : models/rf_model.pkl
         models/rf_X_test.csv
         models/rf_y_test.csv
         processed_data/target_encoder.pkl
Prints : Accuracy, Classification Report, Confusion Matrix,
         Confidence Scores, Top Feature Importances
"""

import os
import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)


# ==========================================================
# PATHS
# ==========================================================

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR    = os.path.join(SCRIPT_DIR, "models")
PROCESSED_DIR = os.path.join(SCRIPT_DIR, "processed_data")

MODEL_PATH    = os.path.join(MODELS_DIR, "rf_model.pkl")
X_TEST_PATH   = os.path.join(MODELS_DIR, "rf_X_test.csv")
Y_TEST_PATH   = os.path.join(MODELS_DIR, "rf_y_test.csv")
TGT_ENC_PATH  = os.path.join(PROCESSED_DIR, "target_encoder.pkl")


# ==========================================================
# HELPERS
# ==========================================================

def print_confusion_matrix(cm, class_names):
    col_width = max(len(n) for n in class_names) + 2
    header = " " * col_width + "".join(
        f"{n:>{col_width}}" for n in class_names
    )
    print("\n  " + header)
    print("  " + "-" * len(header))
    for i, row in enumerate(cm):
        row_str = f"  {class_names[i]:<{col_width}}"
        for val in row:
            row_str += f"{val:>{col_width}}"
        print(row_str)
    print()


# ==========================================================
# MAIN
# ==========================================================

def evaluate():
    print("\n========== MODEL EVALUATION STARTED ==========\n")

    # ----------------------------------------------------------
    # 1. Check all files exist
    # ----------------------------------------------------------
    for path, name in [
        (MODEL_PATH,   "rf_model.pkl"),
        (X_TEST_PATH,  "rf_X_test.csv"),
        (Y_TEST_PATH,  "rf_y_test.csv"),
        (TGT_ENC_PATH, "target_encoder.pkl"),
    ]:
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"{name} not found at {path}\n"
                "Run preprocessing.py and train_randomforest.py first."
            )

    # ----------------------------------------------------------
    # 2. Load
    # ----------------------------------------------------------
    print("Loading model and test data...")
    model          = joblib.load(MODEL_PATH)
    target_encoder = joblib.load(TGT_ENC_PATH)
    X_test         = pd.read_csv(X_TEST_PATH)
    y_test         = pd.read_csv(Y_TEST_PATH).iloc[:, 0].values

    class_names = target_encoder.classes_.tolist()

    print(f"  Test samples : {X_test.shape[0]}")
    print(f"  Features     : {X_test.shape[1]}")
    print(f"  Classes      : {class_names}")

    # ----------------------------------------------------------
    # 3. Predict
    # ----------------------------------------------------------
    print("\nGenerating predictions on unseen test data...")
    y_pred       = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    # ----------------------------------------------------------
    # 4. Overall Accuracy
    # ----------------------------------------------------------
    accuracy = accuracy_score(y_test, y_pred)

    print("\n" + "=" * 52)
    print(f"  OVERALL ACCURACY : {accuracy * 100:.2f}%")
    print("=" * 52)

    # ----------------------------------------------------------
    # 5. Classification Report
    # ----------------------------------------------------------
    y_test_labels = target_encoder.inverse_transform(y_test)
    y_pred_labels = target_encoder.inverse_transform(y_pred)

    print("\n--- CLASSIFICATION REPORT ---\n")
    print("(Precision = when model says X, how often right)")
    print("(Recall    = out of all real X, how many found )")
    print("(F1-Score  = balanced average of precision & recall)\n")
    print(
        classification_report(
            y_test_labels,
            y_pred_labels,
            target_names=class_names,
            digits=4,
        )
    )

    # ----------------------------------------------------------
    # 6. Confusion Matrix
    # ----------------------------------------------------------
    cm = confusion_matrix(y_test, y_pred)
    print("--- CONFUSION MATRIX ---")
    print("(Rows = Actual class, Columns = Predicted class)")
    print("(Diagonal = correct predictions)\n")
    print_confusion_matrix(cm, class_names)

    # ----------------------------------------------------------
    # 7. Per-class confidence scores
    # ----------------------------------------------------------
    print("--- AVERAGE CONFIDENCE SCORES PER PREDICTION ---\n")
    for i, cls in enumerate(class_names):
        mask = y_pred == i
        if mask.sum() > 0:
            avg_conf = y_pred_proba[mask, i].mean() * 100
            print(f"  {cls:<40} avg confidence: {avg_conf:.1f}%")

    # ----------------------------------------------------------
    # 8. Top 10 Feature Importances
    # ----------------------------------------------------------
    importances = pd.Series(
        model.feature_importances_,
        index=X_test.columns
    ).sort_values(ascending=False)

    print("\n--- TOP 10 FEATURES DRIVING THE PREDICTION ---\n")
    for rank, (feat, score) in enumerate(
        importances.head(10).items(), start=1
    ):
        bar = "#" * int(score * 200)
        print(f"  {rank:>2}. {feat:<45} {score:.4f}  {bar}")

    print("\n========== EVALUATION COMPLETED ==========\n")
    print("Next step -> run: python predict.py")


if __name__ == "__main__":
    evaluate()
