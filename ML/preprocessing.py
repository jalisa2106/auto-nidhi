import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def preprocess_data(dataset_path, output_dir):
    print("--- Starting Preprocessing ---")
    
    # 1. Load CSV
    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"Original shape: {df.shape}")
    
    # 2. Remove duplicates
    initial_rows = len(df)
    df = df.drop_duplicates()
    duplicated_rows = initial_rows - len(df)
    print(f"Removed {duplicated_rows} duplicate row(s). New shape: {df.shape}")
    
    # 3. Convert datatypes (Datetime columns to numeric timestamps)
    print("Converting date columns to numeric timestamps...")
    # Find columns that look like dates or contain 'date'/'created_at'/'updated_at'
    date_cols = [col for col in df.columns if 'date' in col.lower() or 'created_at' in col.lower() or 'updated_at' in col.lower()]
    for col in date_cols:
        # Parse to datetime
        parsed_dates = pd.to_datetime(df[col], errors='coerce')
        # Convert NaNs to a default reference date (e.g., the oldest date in dataset) before transforming to timestamp
        reference_date = parsed_dates.min()
        if pd.isna(reference_date):
            reference_date = pd.Timestamp('2023-01-01')
        
        # Fill missing dates with the reference date
        parsed_dates = parsed_dates.fillna(reference_date)
        
        # Convert to numeric format (Unix timestamp in seconds)
        df[col] = (parsed_dates - pd.Timestamp("1970-01-01")) // pd.Timedelta('1s')
        df[col] = df[col].astype('float64')

    # 4. Handle missing values
    print("Handling missing values...")
    for col in df.columns:
        # Target column shouldn't have missing values, but if it does, fill it
        if col == 'ml_recommendation':
            df[col] = df[col].fillna('Needs Manual Review')
            continue
            
        if df[col].dtype == 'object':
            # Fill string/categorical missing values with 'Missing'
            df[col] = df[col].fillna('Missing')
        else:
            # Fill numeric missing values with median
            median_val = df[col].median()
            # If the entire column is null, fill with 0
            if pd.isna(median_val):
                median_val = 0.0
            df[col] = df[col].fillna(median_val)
            
    # 5. Encode categorical columns
    print("Encoding categorical and text columns...")
    label_encoders = {}
    for col in df.columns:
        # Ignore the target column and columns that are already numeric
        if col != 'ml_recommendation' and df[col].dtype == 'object':
            # Make sure everything is converted to string for safe encoding
            df[col] = df[col].astype(str)
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            label_encoders[col] = le
            
    # 6. Split train/test
    # Encode target variable
    target_col = 'ml_recommendation'
    target_encoder = LabelEncoder()
    y = target_encoder.fit_transform(df[target_col])
    
    # All other columns are features (no dropping of columns)
    X = df.drop(columns=[target_col])
    
    print(f"Target Label Mapping: {dict(zip(range(len(target_encoder.classes_)), target_encoder.classes_))}")
    
    # Split: 80% Train, 20% Test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # 7. Save preprocessed outputs
    os.makedirs(output_dir, exist_ok=True)
    
    X_train.to_csv(os.path.join(output_dir, 'X_train.csv'), index=False)
    X_test.to_csv(os.path.join(output_dir, 'X_test.csv'), index=False)
    
    pd.DataFrame(y_train, columns=[target_col]).to_csv(os.path.join(output_dir, 'y_train.csv'), index=False)
    pd.DataFrame(y_test, columns=[target_col]).to_csv(os.path.join(output_dir, 'y_test.csv'), index=False)
    
    print(f"\nSplit complete:")
    print(f"X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")
    print(f"Processed datasets successfully saved to: {output_dir}")
    print("--- Preprocessing Complete ---")

if __name__ == "__main__":
    # Get the directory where preprocessing.py itself is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    raw_dataset = os.path.join(script_dir, 'dataset', 'master_dataset_with_ml_recommendation.csv')
    processed_dir = os.path.join(script_dir, 'processed_data')
    
    preprocess_data(raw_dataset, processed_dir)