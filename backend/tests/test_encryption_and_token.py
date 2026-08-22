"""
Tests for Fernet token encryption and get_valid_access_token.

Covers:
- encrypt/decrypt roundtrip
- wrong-key rejection
- get_valid_access_token: valid token, near-expiry refresh, refresh fallback
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.core.encryption import TokenEncryption, decrypt_token, encrypt_token
from app.models.merchant import Merchant, SubscriptionStatus
from app.utils.shopify_auth import _REFRESH_BUFFER_SECONDS, get_valid_access_token


# ── Helpers ────────────────────────────────────────────────────────────────────


def make_merchant(
    access_token: str = "shpua_access_token_abc",
    *,
    refresh_token: str | None = None,
    expires_at: datetime | None = None,
) -> Merchant:
    m = Merchant(
        shop_domain="tokentest.myshopify.com",
        merchant_email="merchant@tokentest.com",
        subscription_status=SubscriptionStatus.ACTIVE,
        bonus_percentage=10,
        bonus_cap_cents=5000,
        brand_color="#000000",
        access_token_encrypted=encrypt_token(access_token),
    )
    if refresh_token is not None:
        m.refresh_token_encrypted = encrypt_token(refresh_token)
    m.access_token_expires_at = expires_at
    return m


# ── Encryption roundtrip ───────────────────────────────────────────────────────


def test_encrypt_decrypt_roundtrip():
    plaintext = "shpua_test_token_xyz789"
    encrypted = encrypt_token(plaintext)
    assert isinstance(encrypted, bytes)
    assert decrypt_token(encrypted) == plaintext


def test_encrypted_bytes_do_not_contain_plaintext():
    plaintext = "shpua_secret_token"
    encrypted = encrypt_token(plaintext)
    assert plaintext.encode() not in encrypted


def test_same_plaintext_produces_different_ciphertexts():
    # Fernet uses a random IV — each call must differ
    plaintext = "shpua_same_token"
    assert encrypt_token(plaintext) != encrypt_token(plaintext)


def test_wrong_fernet_key_raises_invalid_token():
    plaintext = "shpua_real_token"
    encrypted = encrypt_token(plaintext)

    other_key = Fernet.generate_key().decode()
    with patch("app.core.encryption.settings") as mock_settings:
        mock_settings.ENCRYPTION_KEY = other_key
        other_enc = TokenEncryption()

    with pytest.raises(InvalidToken):
        other_enc.decrypt_token(encrypted)


# ── get_valid_access_token — no expiry ────────────────────────────────────────


async def test_get_valid_access_token_no_expiry_returns_stored(db_session):
    """Token with no expiry timestamp → return stored token as-is, no refresh."""
    merchant = make_merchant("shpua_permanent_token")
    db_session.add(merchant)
    await db_session.commit()

    token = await get_valid_access_token(merchant, db_session)

    assert token == "shpua_permanent_token"


# ── get_valid_access_token — expiry in future ────────────────────────────────


async def test_get_valid_access_token_expiry_far_future_returns_stored(db_session):
    """Token expiring in 1 h is not near the refresh buffer → no refresh."""
    merchant = make_merchant(
        "shpua_fresh_token",
        refresh_token="shprt_refresh",
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.utils.shopify_auth._call_refresh_endpoint",
        new=AsyncMock(),
    ) as mock_refresh:
        token = await get_valid_access_token(merchant, db_session)

    assert token == "shpua_fresh_token"
    mock_refresh.assert_not_called()


# ── get_valid_access_token — near-expiry refresh succeeds ────────────────────


async def test_get_valid_access_token_near_expiry_refresh_succeeds(db_session):
    """Token inside the 5-min buffer → call refresh, persist new tokens."""
    near_expiry = datetime.now(UTC) + timedelta(seconds=_REFRESH_BUFFER_SECONDS - 60)
    merchant = make_merchant(
        "shpua_old_token",
        refresh_token="shprt_old_refresh",
        expires_at=near_expiry,
    )
    db_session.add(merchant)
    await db_session.commit()

    new_expiry = datetime.now(UTC) + timedelta(hours=1)
    with patch(
        "app.utils.shopify_auth._call_refresh_endpoint",
        new=AsyncMock(
            return_value={
                "access_token": "shpua_new_token",
                "refresh_token": "shprt_new_refresh",
                "expires_at": new_expiry,
            }
        ),
    ):
        token = await get_valid_access_token(merchant, db_session)

    assert token == "shpua_new_token"
    # New tokens must be persisted encrypted
    assert decrypt_token(merchant.access_token_encrypted) == "shpua_new_token"
    assert decrypt_token(merchant.refresh_token_encrypted) == "shprt_new_refresh"
    assert merchant.access_token_expires_at == new_expiry


# ── get_valid_access_token — near-expiry refresh fails ───────────────────────


async def test_get_valid_access_token_refresh_fails_fallback_to_stored(db_session):
    """Refresh endpoint returns None → fall back to existing token without crashing."""
    near_expiry = datetime.now(UTC) + timedelta(seconds=_REFRESH_BUFFER_SECONDS - 60)
    merchant = make_merchant(
        "shpua_fallback_token",
        refresh_token="shprt_failing_refresh",
        expires_at=near_expiry,
    )
    db_session.add(merchant)
    await db_session.commit()

    with patch(
        "app.utils.shopify_auth._call_refresh_endpoint",
        new=AsyncMock(return_value=None),
    ):
        token = await get_valid_access_token(merchant, db_session)

    assert token == "shpua_fallback_token"
    # Stored token must not have been overwritten
    assert decrypt_token(merchant.access_token_encrypted) == "shpua_fallback_token"
