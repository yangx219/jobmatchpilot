import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("bridge", Path(__file__).with_name("jobspy_bridge.py"))
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

class Frame:
    def __init__(self, rows=None, errors=None):
        self.rows = rows or []
        self.attrs = {"errors": errors or {}}
    def to_json(self, **kwargs): return json.dumps(self.rows)

class BridgeTests(unittest.TestCase):
    def row(self, suffix="1"):
        return {"title": "Java Developer", "job_url": f"https://example.com/{suffix}", "date_posted": "2026-10-25T00:00:00.000", "location": "Paris", "company": "Example"}
    def test_relative_hellowork_date_is_not_presented_as_actual_date(self):
        with patch.object(bridge, "scrape_jobs", return_value=Frame([self.row()])):
            job = bridge.search_one(("hellowork", "Java", {}))["jobs"][0]
            self.assertIsNone(job["postedDate"])
    def test_linkedin_absolute_source_day_is_preserved(self):
        with patch.object(bridge, "scrape_jobs", return_value=Frame([self.row()])):
            job = bridge.search_one(("linkedin", "Java", {}))["jobs"][0]
            self.assertEqual(job["postedDate"], "2026-10-25T00:00:00.000")
            self.assertEqual(job["postedDatePrecision"], "day")
    def test_timeout_retries_once_and_retains_partial_results(self):
        frames = [Frame([self.row("1")], {"hellowork": "curl: (28) timed out"}), Frame([self.row("2")])]
        with patch.object(bridge, "scrape_jobs", side_effect=frames) as scrape, patch("time.sleep"):
            result = bridge.search_one(("hellowork", "Java", {}))
            self.assertEqual(scrape.call_count, 2)
            self.assertEqual(len(result["jobs"]), 2)
            self.assertEqual(result["errors"], [])
    def test_access_denial_is_not_retried_or_given_credentials(self):
        with patch.object(bridge, "scrape_jobs", return_value=Frame(errors={"glassdoor": "response status code 403"})) as scrape:
            result = bridge.search_one(("glassdoor", "Java", {}))
            self.assertEqual(scrape.call_count, 1)
            self.assertTrue(result["errors"])
            self.assertNotIn("proxies", scrape.call_args.kwargs)
            self.assertNotIn("cookies", scrape.call_args.kwargs)

if __name__ == "__main__": unittest.main()
