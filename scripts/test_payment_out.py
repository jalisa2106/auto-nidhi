import requests
import json
import uuid

# First get a file_id
r = requests.get('http://localhost:8000/api/v1/files?page=1&limit=10')
files = r.json().get('data', [])
if not files:
    print("No files available!")
    exit(1)

file_id = files[0]['id']

payload = {
    "file_id": file_id,
    "payment_to": "Dealer",
    "payee_name": "Test Dealer",
    "amount": 1000.0,
    "payment_mode": "Cash",
    "payment_date": "2024-05-25"
}

print(f"Sending payload: {json.dumps(payload, indent=2)}")
res = requests.post('http://localhost:8000/api/v1/payments/out', json=payload)
print(f"Status Code: {res.status_code}")
print(f"Response: {res.text}")
