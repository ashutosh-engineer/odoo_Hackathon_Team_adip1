"""
Budget Health Service — Smart analytics & anomaly detection.

Calculates a 0-100 "Budget Health" score for a trip based on:
  - Ratio of current spend to estimated city cost benchmarks
  - Whether activity costs are on track for the trip duration
  - Anomaly flags when a single category dominates spend

Score bands:
  80-100  Healthy   (green)
  50-79   Caution   (amber)
  0-49    At Risk   (red)
"""

from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class BudgetHealthReport:
    score: int                          # 0-100
    band: str                           # 'healthy' | 'caution' | 'at_risk'
    estimated_total: float              # projected final spend
    budget_limit: float | None          # user-set limit (if any)
    daily_rate: float                   # current avg spend per day
    recommended_daily: float | None     # what they should spend per day
    anomalies: list[str] = field(default_factory=list)
    tips: list[str] = field(default_factory=list)


def calculate(trip, expenses: list, activity_cost: float) -> BudgetHealthReport:
    """
    Main entry point.  Pass the Trip ORM object, list of TripExpense rows,
    and the pre-calculated activity cost total.
    """
    manual_total = sum(e.amount for e in expenses)
    grand_total  = manual_total + activity_cost

    # ── Estimated final spend ──────────────────────────────────────────────
    # Use city cost_index averages to project what the full trip will cost
    estimated_total = _project_total(trip, activity_cost)

    # ── Daily rate ────────────────────────────────────────────────────────
    duration = trip.duration_days or 1
    daily_rate = round(grand_total / duration, 2)

    # ── Budget limit (stored as a trip expense with category='budget_limit') ──
    budget_limit = None
    limit_expense = next((e for e in expenses if e.category == 'budget_limit'), None)
    if limit_expense:
        budget_limit = limit_expense.amount

    recommended_daily = round(budget_limit / duration, 2) if budget_limit else None

    # ── Score calculation ─────────────────────────────────────────────────
    score, anomalies, tips = _score(
        grand_total, estimated_total, budget_limit,
        daily_rate, recommended_daily, expenses, duration
    )

    band = 'healthy' if score >= 80 else ('caution' if score >= 50 else 'at_risk')

    return BudgetHealthReport(
        score=score,
        band=band,
        estimated_total=round(estimated_total, 2),
        budget_limit=budget_limit,
        daily_rate=daily_rate,
        recommended_daily=recommended_daily,
        anomalies=anomalies,
        tips=tips,
    )


# ── Private helpers ───────────────────────────────────────────────────────────

def _project_total(trip, activity_cost: float) -> float:
    """
    Project the final trip cost using city cost_index benchmarks.
    cost_index is a 0-100 scale where 50 ≈ $150/day.
    """
    stops = trip.stops.all()
    if not stops:
        return activity_cost

    total_projected = 0.0
    for stop in stops:
        city = stop.city
        if not city:
            continue
        # Map cost_index (0-100) to a daily rate: index 50 → $150/day
        daily_city_rate = (city.cost_index / 50) * 150
        days = stop.duration_days or 1
        total_projected += daily_city_rate * days

    # Add activity costs on top
    return total_projected + activity_cost


def _score(
    grand_total: float,
    estimated_total: float,
    budget_limit: float | None,
    daily_rate: float,
    recommended_daily: float | None,
    expenses: list,
    duration: int,
) -> tuple[int, list[str], list[str]]:
    """Return (score 0-100, anomaly messages, tip messages)."""
    score = 100
    anomalies: list[str] = []
    tips: list[str] = []

    # ── Rule 1: Over budget limit ─────────────────────────────────────────
    if budget_limit and grand_total > 0:
        ratio = grand_total / budget_limit
        if ratio > 1.0:
            over_pct = round((ratio - 1) * 100)
            score -= min(50, int(over_pct * 0.8))
            anomalies.append(f'You are {over_pct}% over your set budget limit.')
            tips.append('Consider removing lower-priority activities to reduce costs.')
        elif ratio > 0.85:
            score -= 15
            tips.append('You are approaching your budget limit — review upcoming expenses.')

    # ── Rule 2: Projected to exceed estimate ──────────────────────────────
    if estimated_total > 0 and grand_total > estimated_total * 1.1:
        score -= 20
        anomalies.append(
            f'Current spend (${grand_total:.0f}) is tracking above the city-cost estimate (${estimated_total:.0f}).'
        )

    # ── Rule 3: Daily rate anomaly ────────────────────────────────────────
    if recommended_daily and daily_rate > recommended_daily * 1.2:
        score -= 10
        anomalies.append(
            f'Daily spend rate (${daily_rate:.0f}/day) exceeds recommended (${recommended_daily:.0f}/day).'
        )

    # ── Rule 4: Category concentration ───────────────────────────────────
    if grand_total > 0:
        cat_totals: dict[str, float] = {}
        for e in expenses:
            if e.category != 'budget_limit':
                cat_totals[e.category] = cat_totals.get(e.category, 0) + e.amount
        for cat, amt in cat_totals.items():
            pct = amt / grand_total
            if pct > 0.6:
                score -= 10
                anomalies.append(
                    f'"{cat.title()}" makes up {round(pct*100)}% of your budget — consider diversifying.'
                )
                break

    # ── Rule 5: No budget set ─────────────────────────────────────────────
    if not budget_limit:
        score -= 5
        tips.append('Set a budget limit to unlock personalised health tracking.')

    score = max(0, min(100, score))
    return score, anomalies, tips
