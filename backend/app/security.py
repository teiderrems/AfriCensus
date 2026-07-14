import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any
from uuid import uuid4


SECRET_KEY = os.getenv("AFRICENSUS_SECRET_KEY", "dev-secret-change-me")
ACCESS_TOKEN_TTL = int(os.getenv("AFRICENSUS_ACCESS_TOKEN_TTL", "3600"))
REFRESH_TOKEN_TTL = int(os.getenv("AFRICENSUS_REFRESH_TOKEN_TTL", "604800"))
PASSWORD_ITERATIONS = int(os.getenv("AFRICENSUS_PASSWORD_ITERATIONS", "210000"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, digest = password_hash.split("$", 3)
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), base64.urlsafe_b64decode(_pad(salt)), int(iterations))
            return hmac.compare_digest(_b64(candidate), digest)
        except (ValueError, TypeError):
            return False
    return hmac.compare_digest(_legacy_hash_password(password), password_hash)


import jwt

def create_token(subject: str, role: str, token_type: str = "access") -> str:
    ttl = ACCESS_TOKEN_TTL if token_type == "access" else REFRESH_TOKEN_TTL
    payload = {
        "sub": subject,
        "role": role,
        "typ": token_type,
        "jti": str(uuid4()),
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid token format or signature") from exc

    if payload.get("typ") != expected_type:
        raise ValueError("Invalid token type")
    return payload


def _sign(body: str) -> str:
    digest = hmac.new(SECRET_KEY.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    return _b64(digest)


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _pad(value: str) -> bytes:
    return f"{value}{'=' * (-len(value) % 4)}".encode("utf-8")


def _legacy_hash_password(password: str) -> str:
    return hashlib.sha256(f"africensus:{password}".encode("utf-8")).hexdigest()
