# ==========================================================
# RISK SCORE
# ==========================================================

def calculate_risk_score(
    loan_amount,
    emi_amount,
    remaining_amount,
    amount_recovered,
    old_loan_amount
):
    """
    Returns risk score between 0 and 10

    Higher score = Higher risk
    Lower score = Safer customer
    """

    score = 0

    # ======================================================
    # LOAN AMOUNT
    # ======================================================

    if loan_amount <= 700000:
        score += 0

    elif loan_amount <= 1200000:
        score += 1

    else:
        score += 2

    # ======================================================
    # EMI AMOUNT
    # ======================================================

    if emi_amount <= 15000:
        score += 0

    elif emi_amount <= 30000:
        score += 1

    else:
        score += 2

    # ======================================================
    # REMAINING AMOUNT
    # ======================================================

    if remaining_amount <= 10000:
        score += 0

    elif remaining_amount <= 50000:
        score += 1

    elif remaining_amount <= 100000:
        score += 2

    else:
        score += 3

    # ======================================================
    # RECOVERY STATUS
    # ======================================================

    if amount_recovered <= 0:
        score += 2

    elif amount_recovered < remaining_amount:
        score += 1

    else:
        score += 0

    # ======================================================
    # OLD LOAN HISTORY
    # ======================================================

    if old_loan_amount <= 0:
        score += 0

    elif old_loan_amount <= 500000:
        score += 1

    else:
        score += 2

    # Maximum score capped at 10

    return min(int(score), 10)


# ==========================================================
# RECOMMENDATION
# ==========================================================

def get_recommendation(risk_score):
    """
    Converts risk score into recommendation
    """

    if risk_score <= 3:
        return "Likely Approved"

    elif risk_score <= 6:
        return "Needs Manual Review"

    return "High Risk / Likely Rejected"


# ==========================================================
# CONFIDENCE SCORE
# ==========================================================

def get_confidence_score(risk_score):
    """
    Rule-based confidence score.
    Used only as fallback.
    """

    if risk_score <= 3:
        return 85.0

    elif risk_score <= 6:
        return 75.0

    return 90.0


# ==========================================================
# COMPLETE DECISION
# ==========================================================

def get_decision(
    loan_amount,
    emi_amount,
    remaining_amount,
    amount_recovered,
    old_loan_amount
):
    """
    Returns:
    {
        risk_score,
        recommendation,
        confidence_score
    }
    """

    risk_score = calculate_risk_score(
        loan_amount=loan_amount,
        emi_amount=emi_amount,
        remaining_amount=remaining_amount,
        amount_recovered=amount_recovered,
        old_loan_amount=old_loan_amount
    )

    recommendation = get_recommendation(
        risk_score
    )

    confidence_score = get_confidence_score(
        risk_score
    )

    return {
        "risk_score": risk_score,
        "recommendation": recommendation,
        "confidence_score": confidence_score
    }


# ==========================================================
# TEST
# ==========================================================

if __name__ == "__main__":

    result = get_decision(
        loan_amount=1400000,
        emi_amount=32000,
        remaining_amount=120000,
        amount_recovered=10000,
        old_loan_amount=600000
    )

    print(result)