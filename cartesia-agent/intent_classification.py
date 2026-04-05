"""Parity-focused Cartesia intent classification.

This deliberately mirrors the canonical browser/server implementation in
`shared/utils/intentClassification.ts` so the Cartesia agent and the standard
Address Finder path make the same search-intent decisions.
"""

from __future__ import annotations

import re

STREET_KEYWORDS = [
    "street",
    "st",
    "road",
    "rd",
    "avenue",
    "ave",
    "lane",
    "ln",
    "drive",
    "dr",
    "way",
    "crescent",
    "cres",
    "court",
    "ct",
    "place",
    "pl",
    "terrace",
    "tce",
    "grove",
    "close",
    "boulevard",
    "blvd",
    "parade",
    "pde",
    "circuit",
    "cct",
    "walk",
    "mews",
    "row",
    "square",
    "sq",
    "esplanade",
    "esp",
    "highway",
    "hwy",
    "parkway",
    "pkwy",
    "reserve",
    "res",
    "rise",
    "ridge",
    "retreat",
    "gardens",
    "gdns",
    "green",
    "grn",
    "heights",
    "hts",
    "hill",
    "outlook",
    "vista",
    "promenade",
    "prom",
    "strand",
    "quay",
    "wharf",
    "pier",
    "mall",
    "plaza",
    "link",
    "loop",
    "bend",
    "corner",
    "crossing",
    "cir",
    "circle",
]

RURAL_KEYWORDS = [
    "hwy",
    "highway",
    "rd",
    "road",
    "lane",
    "track",
    "station",
    "farm",
    "mount",
    "creek",
    "way",
    "drive",
    "dr",
    "ln",
    "springmount",
]

STREET_KEYWORD_REGEXES = [
    re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)
    for keyword in STREET_KEYWORDS
]
RURAL_KEYWORD_REGEXES = [
    re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE)
    for keyword in RURAL_KEYWORDS
]

HOUSE_NUMBER_BASIC = re.compile(r"^(\d+[a-z]?([/-]\d+[a-z]?)*)\s+")
UNIT_DETAILED = re.compile(
    r"^(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*[,\s]",
    re.IGNORECASE,
)
UNIT_COMPLEX = re.compile(r"^[a-z]?\d+([/-]\d+[a-z]?)*[,/]\s*\d+\s+", re.IGNORECASE)
UNIT_ANYWHERE = re.compile(
    r"\b(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*\b",
    re.IGNORECASE,
)
POSTCODE_BASIC = re.compile(r"\b\d{4}\b")
AUSTRALIAN_STATE_FULL = re.compile(
    r"\b(vic|nsw|qld|wa|sa|tas|nt|act|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b",
    re.IGNORECASE,
)
SUBURB_INDICATOR_DIRECTIONAL = re.compile(
    r"\b(north|south|east|west|upper|lower|mount|mt|saint|st|port|glen|box|point|new|old)\s+[a-z]",
    re.IGNORECASE,
)
SUBURB_INDICATOR_GEOGRAPHIC = re.compile(
    r"\b(heights|gardens|valley|beach|park|creek|hill|ridge|bay|cove|grove|lakes|springs|falls)\b",
    re.IGNORECASE,
)
SUBURB_LIKE = re.compile(r"^[a-z0-9\s\-'&]+$", re.IGNORECASE)
NOT_PURE_NUMBER = re.compile(r"^\d+$")
SPECIAL_SUBURB_PATTERNS = [
    re.compile(r"^st\s+kilda", re.IGNORECASE),
    re.compile(r"^(mount|mt)\s+", re.IGNORECASE),
    re.compile(r"^port\s+", re.IGNORECASE),
    re.compile(r"^glen\s+", re.IGNORECASE),
    re.compile(r"^box\s+hill", re.IGNORECASE),
    re.compile(r"^st\s+albans", re.IGNORECASE),
    re.compile(r"^point\s+", re.IGNORECASE),
]
COMPLETE_SPECIAL_SUBURB_PATTERNS = [
    re.compile(r"^box\s+hill$", re.IGNORECASE),
]
SPECIAL_PREFIX = re.compile(r"^(st|mt|mount|port|glen|point)\s+", re.IGNORECASE)


def classify_location_intent(query: str) -> str:
    lower_query = query.strip().lower()
    if not lower_query:
        return "general"

    has_house_number = bool(HOUSE_NUMBER_BASIC.search(lower_query))
    has_unit_number = bool(UNIT_DETAILED.search(lower_query) or UNIT_COMPLEX.search(lower_query))

    if has_house_number or has_unit_number:
        return "address"

    is_special_suburb = any(pattern.search(lower_query) for pattern in SPECIAL_SUBURB_PATTERNS)
    if is_special_suburb:
        if any(pattern.search(lower_query) for pattern in COMPLETE_SPECIAL_SUBURB_PATTERNS):
            return "suburb"

        without_special_prefix = SPECIAL_PREFIX.sub("", lower_query)
        has_additional_street_type = any(
            regex.search(without_special_prefix) for regex in STREET_KEYWORD_REGEXES
        )

        if has_additional_street_type and not has_house_number and not has_unit_number:
            return "street"
        if (has_house_number or has_unit_number) and has_additional_street_type:
            return "address"
        return "suburb"

    has_street_type = any(regex.search(lower_query) for regex in STREET_KEYWORD_REGEXES)
    has_rural_type = any(regex.search(lower_query) for regex in RURAL_KEYWORD_REGEXES)

    if has_street_type and not has_house_number and not has_unit_number:
        return "street"

    if UNIT_ANYWHERE.search(lower_query):
        return "address"

    has_postcode = bool(POSTCODE_BASIC.search(lower_query))
    has_australian_state = bool(AUSTRALIAN_STATE_FULL.search(lower_query))
    has_suburb_indicators = bool(
        SUBURB_INDICATOR_DIRECTIONAL.search(lower_query)
        or SUBURB_INDICATOR_GEOGRAPHIC.search(lower_query)
    )

    if (
        (has_postcode or has_australian_state or has_suburb_indicators)
        and not has_street_type
        and not has_rural_type
    ):
        return "suburb"

    is_suburb_like_text = bool(
        SUBURB_LIKE.fullmatch(lower_query) and not NOT_PURE_NUMBER.fullmatch(lower_query)
    )
    if (
        is_suburb_like_text
        and not has_street_type
        and not has_rural_type
        and len(lower_query) > 2
    ):
        return "suburb"

    return "general"
