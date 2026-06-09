# ==========================================================
# RISK SCORE
# ==========================================================

def calculate_risk_score(
    loan_amount,
    emi_amount,
    active_overdue_amount,
    overdue_emi_count
):
    """
    Returns risk score between 0 and 10
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
    # ACTIVE OVERDUE AMOUNT
    # ======================================================

    if active_overdue_amount <= 10000:
        score += 0

    elif active_overdue_amount <= 50000:
        score += 2

    else:
        score += 3

    # ======================================================
    # OVERDUE EMI COUNT
    # ======================================================

    if overdue_emi_count == 0:
        score += 0

    elif overdue_emi_count == 1:
        score += 1

    elif overdue_emi_count <= 3:
        score += 2

    else:
        score += 3

    return int(score)


# ==========================================================
# RECOMMENDATION
# ==========================================================

def get_recommendation(risk_score):
    """
    Converts risk score into recommendation
    """

    if risk_score <= 2:
        return "Likely Approved"

    elif risk_score <= 5:
        return "Needs Manual Review"

    return "High Risk / Likely Rejected"


# ==========================================================
# CONFIDENCE SCORE
# ==========================================================

def get_confidence_score(risk_score):
    """
    Rule-based confidence score.

    Used only as a fallback.
    ML model probability should be preferred later.
    """

    if risk_score <= 2:
        return 85.0

    elif risk_score <= 5:
        return 75.0

    return 90.0


# ==========================================================
# COMPLETE DECISION
# ==========================================================

def get_decision(
    loan_amount,
    emi_amount,
    active_overdue_amount,
    overdue_emi_count
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
        active_overdue_amount=active_overdue_amount,
        overdue_emi_count=overdue_emi_count
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
        active_overdue_amount=60000,
        overdue_emi_count=3
    )

    print(result)