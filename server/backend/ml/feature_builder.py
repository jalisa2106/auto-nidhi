import os
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

query = """
SELECT COUNT(*)
FROM customer
"""

df = pd.read_sql(query, engine)

output_file = "master_dataset.csv"
df.to_csv(output_file, index=False)

print(f"Dataset exported successfully!")
print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")
print(f"Saved to: {output_file}")