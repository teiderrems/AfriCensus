import pytest
import time
from app.security import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    _legacy_hash_password,
)

def test_hash_password():
    password = "SuperSecretPassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert hashed.startswith("pbkdf2_sha256$")
    assert len(hashed.split("$")) == 4
    
    # Verify different salt each time
    hashed2 = hash_password(password)
    assert hashed != hashed2

def test_verify_password():
    password = "SuperSecretPassword123"
    wrong_password = "SuperSecretPassword124"
    hashed = hash_password(password)
    
    assert verify_password(password, hashed) is True
    assert verify_password(wrong_password, hashed) is False

def test_verify_legacy_password():
    password = "OldSchoolPassword"
    legacy_hash = _legacy_hash_password(password)
    
    assert verify_password(password, legacy_hash) is True
    assert verify_password("wrong", legacy_hash) is False

def test_create_and_decode_token():
    subject = "user123"
    role = "admin"
    
    token = create_token(subject, role)
    assert isinstance(token, str)
    
    decoded = decode_token(token)
    assert decoded["sub"] == subject
    assert decoded["role"] == role
    assert decoded["typ"] == "access"
    assert "jti" in decoded
    assert "exp" in decoded

def test_create_refresh_token():
    token = create_token("user123", "user", token_type="refresh")
    decoded = decode_token(token, expected_type="refresh")
    
    assert decoded["typ"] == "refresh"
    assert decoded["sub"] == "user123"

def test_decode_token_invalid_type():
    token = create_token("user123", "user", token_type="access")
    with pytest.raises(ValueError, match="Invalid token type"):
        decode_token(token, expected_type="refresh")

def test_decode_token_expired():
    # create token that expires immediately
    token = create_token("user123", "user", expires_delta=-10)
    with pytest.raises(ValueError, match="Token expired"):
        decode_token(token)

def test_decode_invalid_token():
    with pytest.raises(ValueError, match="Invalid token format or signature"):
        decode_token("not.a.real.token")
