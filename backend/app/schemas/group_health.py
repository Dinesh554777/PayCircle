from pydantic import BaseModel


class HealthFactor(BaseModel):
    """One scored aspect of a group's health (0-100)."""

    key: str  # "balance" | "settlement" | "activity"
    label: str
    score: float
    weight: float  # 0-1 share of the final score
    description: str


class GroupHealthOut(BaseModel):
    """An app-level indicator of how well-managed a group is.

    It reflects activity and outstanding balances only; it is not a financial
    or credit score and has no effect on any balance or settlement amount.
    """

    group_id: int
    group_name: str
    score: float
    label: str  # "Excellent" | "Good" | "Fair" | "Needs attention"
    explanation: str
    main_reason: str
    suggested_action: str
    factors: list[HealthFactor]
