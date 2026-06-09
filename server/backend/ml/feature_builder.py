import os
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

query = """
SELECT
    (SELECT COUNT(*) FROM customer) AS customer_count,
    (SELECT COUNT(*) FROM file_record) AS file_count,
    (SELECT COUNT(*) FROM finance_info) AS finance_count,
    (SELECT COUNT(*) FROM advances) AS advances_count,
    (SELECT COUNT(*) FROM payment_in) AS payment_in_count,
    (SELECT COUNT(*) FROM payment_out) AS payment_out_count
"""
df = pd.read_sql(query, engine)

output_file = "master_dataset.csv"
df.to_csv(output_file, index=False)

print(f"Dataset exported successfully!")
print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")
print(f"Saved to: {output_file}")