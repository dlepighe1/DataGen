"""Local semantic value pools — the offline fallback for text columns.

When the LLM is unavailable (or no API key is configured) the engine still
produces meaningful text by matching column names against curated value banks.
Also hosts expand_records(), which recombines name tokens so a small pool of
coherent records (from the LLM or from here) can cover thousands of rows
without obvious repetition while keeping name <-> email consistency.
"""

import re

import numpy as np

FIRST_NAMES = [
    "James", "Maria", "Wei", "Aisha", "Liam", "Sofia", "Noah", "Yuki", "Emma",
    "Omar", "Olivia", "Raj", "Ava", "Diego", "Mia", "Fatima", "Lucas", "Chloe",
    "Ethan", "Priya", "Daniel", "Hana", "Mateo", "Zoe", "Ibrahim", "Elena",
    "Kwame", "Ingrid", "Hiro", "Amara", "Felix", "Nadia", "Tomas", "Leila",
    "Andre", "Sasha", "Marcus", "Imani", "Viktor", "Camila",
]

LAST_NAMES = [
    "Smith", "Garcia", "Chen", "Khan", "Johnson", "Rossi", "Williams", "Tanaka",
    "Brown", "Hassan", "Jones", "Patel", "Miller", "Martinez", "Davis", "Ali",
    "Wilson", "Dubois", "Moore", "Sharma", "Taylor", "Sato", "Anderson", "Lopez",
    "Thomas", "Ahmed", "Mensah", "Larsson", "Yamamoto", "Okafor", "Berger",
    "Petrov", "Silva", "Haddad", "Novak", "Kim", "Olsen", "Diallo", "Costa", "Ivanov",
]

EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "proton.me"]

# Pattern -> value bank, checked in order (first match wins)
_VALUE_BANKS = [
    (r"payment|method", ["Credit Card", "Debit Card", "PayPal", "Apple Pay", "Bank Transfer", "Cash"]),
    (r"delivery|shipping|order.?status", ["Delivered", "Shipped", "Processing", "Cancelled", "Returned", "Pending"]),
    (r"status", ["Active", "Inactive", "Pending", "Completed", "Failed", "On Hold"]),
    (r"currency", ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]),
    (r"product", ["Wireless Earbuds", "Yoga Mat", "Espresso Machine", "Desk Lamp", "Running Shoes",
                  "Bluetooth Speaker", "Water Bottle", "Mechanical Keyboard", "Backpack", "Air Fryer",
                  "Phone Case", "Standing Desk", "Notebook Set", "Webcam", "Resistance Bands"]),
    (r"categor", ["Electronics", "Home & Kitchen", "Sports", "Clothing", "Books", "Beauty", "Toys", "Groceries"]),
    (r"merchant|store|vendor", ["Amazon", "Target Store", "Whole Foods", "Best Electronics", "City Pharmacy",
                                "Corner Cafe", "Shell Station", "Hilton Hotels", "Uber", "Netflix"]),
    (r"account.?type", ["Checking", "Savings", "Credit", "Investment", "Business"]),
    (r"gender|sex", ["Male", "Female", "Non-binary"]),
    (r"diagnos", ["Hypertension", "Type 2 Diabetes", "Asthma", "Migraine", "Seasonal Allergies",
                  "Lower Back Pain", "Anxiety Disorder", "Influenza", "Anemia", "Arthritis"]),
    (r"treatment|plan", ["Medication & monitoring", "Physical therapy", "Lifestyle changes & diet",
                         "Surgery scheduled", "Counseling sessions", "Inhaler therapy", "Observation only"]),
    (r"medicat|drug|prescri", ["Lisinopril", "Metformin", "Albuterol", "Ibuprofen", "Sumatriptan",
                               "Cetirizine", "Sertraline", "Amoxicillin", "Atorvastatin", "Omeprazole"]),
    (r"blood.?pressure", ["118/76", "124/82", "132/88", "141/92", "110/70", "128/84", "150/95", "115/75"]),
    (r"grade|letter", ["A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"]),
    (r"course|subject|class", ["Algebra II", "Biology", "World History", "English Literature", "Chemistry",
                               "Computer Science", "Physics", "Statistics", "Spanish", "Art & Design"]),
    (r"position|role", ["Forward", "Midfielder", "Defender", "Goalkeeper", "Center", "Point Guard", "Pitcher", "Catcher"]),
    (r"sport", ["Soccer", "Basketball", "Baseball", "Tennis", "Hockey", "Volleyball", "Rugby"]),
    (r"team", ["Red Falcons", "City United", "Northside Wolves", "Bay Sharks", "Golden Eagles",
               "Riverside Royals", "Thunder FC", "Mountain Lions"]),
    (r"game.?title|game", ["Starfield Odyssey", "Dungeon Quest III", "Speed Racers", "Mystic Realms",
                           "Battle Arena Pro", "Farm Valley", "Galaxy Defenders", "Puzzle Kingdom"]),
    (r"campaign", ["Summer Sale 2026", "Back to School", "Holiday Promo", "New Year Blast",
                   "Spring Launch", "Flash Friday", "Loyalty Rewards Push"]),
    (r"city", ["Chicago", "Austin", "Seattle", "Denver", "Atlanta", "Boston", "Portland", "Nashville"]),
    (r"country", ["United States", "Canada", "Germany", "Japan", "Brazil", "India", "France", "Australia"]),
]

_GENERIC_ADJ = ["Bright", "Silver", "Northern", "Prime", "Coastal", "Urban", "Classic", "Modern", "Swift", "Royal"]
_GENERIC_NOUN = ["Horizon", "Summit", "Harbor", "Beacon", "Meadow", "Crest", "Haven", "Junction", "Grove", "Vista"]

_NAME_PATTERN = re.compile(r"name|player|student|patient|customer|user|employee|owner|author|holder", re.IGNORECASE)
_PERSON_HINT = re.compile(r"full.?name|first|last|player|student|patient|customer.?name|user.?name|employee", re.IGNORECASE)


def _slug(name):
    return re.sub(r"[^a-z]", "", name.lower())


def _email_from_name(rng, full_name):
    parts = re.sub(r"[^A-Za-z ]", "", full_name).lower().split()
    if not parts:
        parts = ["user"]
    sep = rng.choice([".", "_", ""])
    local = sep.join(parts[:2]) + (str(int(rng.integers(1, 99))) if rng.random() < 0.5 else "")
    domain = EMAIL_DOMAINS[int(rng.integers(0, len(EMAIL_DOMAINS)))]
    return f"{local}@{domain}"


def _value_for_column(rng, col, full_name):
    name = col.get("name", "")
    if col.get("type") == "email":
        return _email_from_name(rng, full_name)
    if _NAME_PATTERN.search(name) and not re.search(r"team|product|game|merchant|store|course|campaign", name, re.IGNORECASE):
        if re.search(r"user.?name", name, re.IGNORECASE):
            return re.sub(r"[^a-z]", "", full_name.lower())[:10] + str(int(rng.integers(10, 999)))
        return full_name
    lowered = name.lower()
    for pattern, bank in _VALUE_BANKS:
        if re.search(pattern, lowered):
            return bank[int(rng.integers(0, len(bank)))]
    return f"{_GENERIC_ADJ[int(rng.integers(0, 10))]} {_GENERIC_NOUN[int(rng.integers(0, 10))]}"


def build_local_records(text_columns, n_records, seed=None):
    """Coherent fallback records: every text column filled per record, with
    person-name and email values derived from the same identity."""
    rng = np.random.default_rng(seed)
    records = []
    for _ in range(n_records):
        first = FIRST_NAMES[int(rng.integers(0, len(FIRST_NAMES)))]
        last = LAST_NAMES[int(rng.integers(0, len(LAST_NAMES)))]
        full_name = f"{first} {last}"
        records.append({col["name"]: _value_for_column(rng, col, full_name) for col in text_columns})
    return records


def expand_records(records, text_columns, target_n, seed=None):
    """Grow a small coherent pool by recombining person-name tokens and
    re-deriving emails, so 10K rows don't repeat the same 60 identities."""
    if not records or len(records) >= target_n:
        return records

    name_cols = [c["name"] for c in text_columns
                 if c.get("type") != "email" and _PERSON_HINT.search(c["name"] or "")]
    email_cols = [c["name"] for c in text_columns if c.get("type") == "email"]
    if not name_cols:
        return records  # nothing to recombine — repetition is fine for categorical data

    rng = np.random.default_rng(seed)
    firsts, lasts = set(FIRST_NAMES), set(LAST_NAMES)
    for r in records:
        for col in name_cols:
            tokens = str(r.get(col, "")).split()
            if len(tokens) >= 2:
                firsts.add(tokens[0])
                lasts.add(tokens[-1])
    firsts, lasts = sorted(firsts), sorted(lasts)

    expanded = list(records)
    while len(expanded) < target_n:
        base = dict(records[int(rng.integers(0, len(records)))])
        full_name = f"{firsts[int(rng.integers(0, len(firsts)))]} {lasts[int(rng.integers(0, len(lasts)))]}"
        for col in name_cols:
            if re.search(r"user.?name", col, re.IGNORECASE):
                base[col] = re.sub(r"[^a-z]", "", full_name.lower())[:10] + str(int(rng.integers(10, 999)))
            else:
                base[col] = full_name
        for col in email_cols:
            base[col] = _email_from_name(rng, full_name)
        expanded.append(base)
    return expanded
