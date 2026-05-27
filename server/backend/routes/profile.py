from fastapi import APIRouter

router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Profile"]
)


@router.get("/me")
async def get_profile():

    return {
        "first_name": "Akshara",
        "last_name": "Pandya",
        "email": "test@example.com",
        "phone_number": "9999999999"
    }


@router.patch("/me")
async def update_profile():

    return {
        "message": "Profile updated successfully"
    }