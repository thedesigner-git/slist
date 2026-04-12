import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

# DEV_MODE=true bypasses JWT validation for local development only.
# Never set this in production — remove or set to false when deploying.
_DEV_MODE = os.environ.get("DEV_MODE", "false").lower() == "true"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if _DEV_MODE:
        return {"sub": "dev-user", "email": "dev@local.com"}

    token = credentials.credentials
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: SUPABASE_JWT_SECRET not set",
        )

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase sets aud to "authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
