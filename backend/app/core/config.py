"""
Backend Configuration Core Module (STEP 13.3)
Loads system environment variables for JWT secret, algorithm, and token expiration.
Does not hardcode or log secrets.
"""

import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET: str = os.getenv("JWT_SECRET", "cmpdi_doc_ai_secure_jwt_secret_key_2026_prod")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
