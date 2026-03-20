from fastapi import APIRouter, Depends

from auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["sub"],
        "email": user.get("email"),
    }
