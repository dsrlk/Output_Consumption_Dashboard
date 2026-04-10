import os
from fastapi import HTTPException, Header
from typing import Optional

# Set this in your Render/Railway environment variables
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Exp@123")

def verify_admin(x_admin_password: Optional[str] = Header(None)):
    """Dependency that validates the admin password header for protected routes."""
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized. Valid X-Admin-Password header required."
        )
