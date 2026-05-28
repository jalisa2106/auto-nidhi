"""
Test all 4 payment/commission Add endpoints exactly like the frontend does.
Uses real file ID and bank ID from DB.
"""
import requests, json

BASE = "http://127.0.0.1:8000/api/v1"

# Real IDs from DB
FILE_ID   = "4e4ccf2a-8377-458d-8437-5051afcc6a0d"   # Akshara Pandya - FILE/2026/001
BANK_ID   = "297b2266-219e-4f3a-951b-6504a2f0859f"   # HDFC Bank

def test(label, method, url, payload):
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"POST {url}")
    print(f"PAYLOAD: {json.dumps(payload, indent=2)}")
    try:
        r = requests.request(method, url, json=payload, timeout=10)
        print(f"STATUS: {r.status_code}")
        print(f"RESPONSE: {r.text}")
        return r.status_code < 300
    except Exception as e:
        print(f"ERROR: {e}")
        return False

# ── 1. Payment IN (exactly what frontend sends) ─────────────────────────────
test("Payment IN - Meet Patel", "POST", f"{BASE}/payments/in", {
    "file_id": FILE_ID,
    "payment_amount": 50000,
    "paid_amount": 50000,
    "remaining_amount": 0,
    "round_up": False,
    "payment_mode": "UPI",          # Frontend sends uppercase
    "payment_date": "2026-05-26",
    "payment_from": "Customer",     # Frontend sends title case
    "utr_no": "UTR202605260001",
    "company_bank_id": BANK_ID,
    "remarks": "Meet Patel payment test"
})

# ── 2. Payment OUT (exactly what frontend sends) ────────────────────────────
test("Payment OUT - Meet Patel", "POST", f"{BASE}/payments/out", {
    "file_id": FILE_ID,
    "payment_to": "Dealer",         # Frontend sends title case
    "payee_name": "Meet Patel",
    "amount": 12000,
    "payment_mode": "NEFT",         # Frontend sends uppercase
    "payment_date": "2026-05-26",
    "company_bank_id": BANK_ID,
    "utr_no": "NFT202605260001",
    "remarks": "Meet Patel payout test"
})

# ── 3. Commission IN (exactly what frontend sends) ──────────────────────────
test("Commission IN - Meet Patel", "POST", f"{BASE}/commissions/in", {
    "file_id": FILE_ID,
    "source_type": "Bank",
    "source_name": "Meet Patel",
    "amount": 8500,
    "advance": False,
    "tds_deducted": False,
    "mode": "RTGS",                 # Frontend sends uppercase
    "payment_date": "2026-05-26",
    "company_bank_id": BANK_ID,
    "utr_no": "RTG202605260001",
    "remarks": "Meet Patel commission test"
})

# ── 4. Commission OUT (exactly what frontend sends) ─────────────────────────
test("Commission OUT - Meet Patel", "POST", f"{BASE}/commissions/out", {
    "file_id": FILE_ID,
    "payee_type": "Dealer",         # Frontend sends title case
    "payee_name": "Meet Patel",
    "amount": 6000,
    "advance": False,
    "tds_deducted": False,
    "mode": "UPI",                  # Frontend sends uppercase
    "payment_date": "2026-05-26",
    "company_bank_id": BANK_ID,
    "remarks": "Meet Patel commission out test"
})
