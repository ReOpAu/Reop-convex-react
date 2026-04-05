import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "cartesia-agent"))

from intent_classification import classify_location_intent


class IntentClassificationParityTest(unittest.TestCase):
    def test_parity_cases_match_shared_fixture(self) -> None:
        fixture_path = ROOT / "tests" / "fixtures" / "cartesia-intent-parity.json"
        cases = json.loads(fixture_path.read_text())

        for case in cases:
            with self.subTest(query=case["query"]):
                self.assertEqual(
                    classify_location_intent(case["query"]),
                    case["intent"],
                )


if __name__ == "__main__":
    unittest.main()
