"""
Fernet symmetric encryption for Shopify access tokens.
Hard rule #2: Store per-shop access tokens encrypted at rest — never in plain text.
"""

from cryptography.fernet import Fernet

from app.core.config import settings


class TokenEncryption:
    """Handles encryption and decryption of Shopify access tokens."""

    def __init__(self) -> None:
        """Initialize Fernet cipher with key from settings."""
        self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())

    def encrypt_token(self, plaintext: str) -> bytes:
        """
        Encrypt a plaintext access token.

        Args:
            plaintext: The access token to encrypt

        Returns:
            Encrypted token as bytes (store in database as BYTEA)
        """
        return self.cipher.encrypt(plaintext.encode())

    def decrypt_token(self, encrypted: bytes) -> str:
        """
        Decrypt an encrypted access token.

        Args:
            encrypted: The encrypted token from database

        Returns:
            Decrypted plaintext access token
        """
        return self.cipher.decrypt(encrypted).decode()


# Global encryption instance
token_encryption = TokenEncryption()


def encrypt_token(plaintext: str) -> bytes:
    """Convenience function to encrypt a token."""
    return token_encryption.encrypt_token(plaintext)


def decrypt_token(encrypted: bytes) -> str:
    """Convenience function to decrypt a token."""
    return token_encryption.decrypt_token(encrypted)
