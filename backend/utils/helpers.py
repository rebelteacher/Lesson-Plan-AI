"""Helper utilities"""
from datetime import timedelta
import uuid


def generate_join_code() -> str:
    """Generate a unique join code"""
    return str(uuid.uuid4())[:8].upper()


def get_weekdays_between(start_date_str: str, end_date_str: str):
    """Get all weekdays between two dates"""
    from datetime import datetime as dt
    start = dt.strptime(start_date_str, "%Y-%m-%d")
    end = dt.strptime(end_date_str, "%Y-%m-%d")
    days = []
    current = start
    while current <= end:
        # 0 = Monday, 6 = Sunday
        if current.weekday() < 5:  # Monday to Friday
            days.append({
                'date': current.strftime("%Y-%m-%d"),
                'day_name': current.strftime("%A")
            })
        current += timedelta(days=1)
    return days
