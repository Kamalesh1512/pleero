"""
Tests for bonus calculation logic.
Ensures bonus percentage and cap are applied correctly.
"""

import pytest
from app.utils.shopify_webhooks import calculate_bonus


class TestBonusCalculation:
    """Test bonus calculation with various amounts and caps."""

    def test_10_percent_bonus(self):
        """Test standard 10% bonus calculation."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=10000,  # $100
            bonus_percentage=10,
            bonus_cap_cents=5000,  # $50 cap
        )

        assert credit_amount == 11000  # $110
        assert bonus_applied == 1000  # $10 bonus

    def test_bonus_cap_enforced(self):
        """Test that bonus cap is enforced on large refunds."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=100000,  # $1000 refund
            bonus_percentage=10,  # Would be $100 bonus
            bonus_cap_cents=5000,  # $50 cap
        )

        assert credit_amount == 105000  # $1000 + $50 = $1050
        assert bonus_applied == 5000  # Capped at $50

    def test_5_percent_minimum_bonus(self):
        """Test minimum 5% bonus."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=10000,  # $100
            bonus_percentage=5,
            bonus_cap_cents=5000,
        )

        assert credit_amount == 10500  # $105
        assert bonus_applied == 500  # $5 bonus

    def test_20_percent_maximum_bonus(self):
        """Test maximum 20% bonus."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=10000,  # $100
            bonus_percentage=20,
            bonus_cap_cents=5000,
        )

        assert credit_amount == 12000  # $120
        assert bonus_applied == 2000  # $20 bonus

    def test_small_refund_amount(self):
        """Test bonus on small refund ($10)."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=1000,  # $10
            bonus_percentage=10,
            bonus_cap_cents=5000,
        )

        assert credit_amount == 1100  # $11
        assert bonus_applied == 100  # $1 bonus

    def test_large_refund_with_cap(self):
        """Test large refund hits bonus cap."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=50000,  # $500
            bonus_percentage=10,  # Would be $50
            bonus_cap_cents=5000,  # $50 cap
        )

        assert credit_amount == 55000  # $550
        assert bonus_applied == 5000  # Exactly at cap

    def test_bonus_cap_minimum(self):
        """Test minimum bonus cap ($10)."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=20000,  # $200
            bonus_percentage=10,  # Would be $20
            bonus_cap_cents=1000,  # $10 cap
        )

        assert credit_amount == 21000  # $210
        assert bonus_applied == 1000  # Capped at $10

    def test_zero_refund_amount(self):
        """Test zero refund amount (edge case)."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=0,
            bonus_percentage=10,
            bonus_cap_cents=5000,
        )

        assert credit_amount == 0
        assert bonus_applied == 0

    def test_exact_cap_amount_refund(self):
        """Test when bonus exactly equals cap."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=50000,  # $500
            bonus_percentage=10,  # 10% = $50
            bonus_cap_cents=5000,  # $50 cap
        )

        assert credit_amount == 55000  # $550
        assert bonus_applied == 5000  # $50 (not capped, equals cap)

    def test_rounding_behavior(self):
        """Test rounding on odd amounts."""
        credit_amount, bonus_applied = calculate_bonus(
            refund_amount_cents=3333,  # $33.33
            bonus_percentage=10,
            bonus_cap_cents=5000,
        )

        # 10% of 3333 = 333.3, should round down to 333
        assert credit_amount == 3666  # $36.66
        assert bonus_applied == 333  # $3.33

    def test_multiple_bonus_percentages(self):
        """Test various bonus percentages on same refund."""
        refund = 10000  # $100
        cap = 5000

        # 5%
        credit_5, bonus_5 = calculate_bonus(refund, 5, cap)
        assert bonus_5 == 500  # $5

        # 10%
        credit_10, bonus_10 = calculate_bonus(refund, 10, cap)
        assert bonus_10 == 1000  # $10

        # 15%
        credit_15, bonus_15 = calculate_bonus(refund, 15, cap)
        assert bonus_15 == 1500  # $15

        # 20%
        credit_20, bonus_20 = calculate_bonus(refund, 20, cap)
        assert bonus_20 == 2000  # $20
