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
    c.*,
    fr.*,
    fi.*,
    a.*,
    pi.*,
    po.*
FROM customer c
LEFT JOIN file_record fr
    ON c.id = fr.customer_id
LEFT JOIN finance_info fi
    ON fr.id = fi.file_id
LEFT JOIN advances a
    ON fr.id = a.file_id
LEFT JOIN payment_in pi
    ON fr.id = pi.file_id
LEFT JOIN payment_out po
    ON fr.id = po.file_id
"""

df = pd.read_sql(query, engine)

output_file = "master_dataset.csv"
df.to_csv(output_file, index=False)

print(f"Dataset exported successfully!")
print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")
print(f"Saved to: {output_file}")