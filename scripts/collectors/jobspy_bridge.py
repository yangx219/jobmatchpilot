"""Bounded public job searches. No cookies, credentials, proxies or auto-apply."""
import contextlib
import json
import sys
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from jobspy import scrape_jobs

ALLOWED = {"linkedin", "indeed", "hellowork", "glassdoor"}

def transient_error(errors):
    if not errors: return False
    text = " ".join(item["reason"].lower() for item in errors)
    if any(code in text for code in ["403", "404", "410", "429", "captcha", "blocked"]): return False
    return any(term in text for term in ["timed out", "timeout", "curl: (28)", "connection reset", "status code 500", "status code 502", "status code 503", "status code 504"])

def search_one(item):
    site, term, cfg = item
    jobs = {}
    errors = []
    for attempt in range(2):
        try:
            with contextlib.redirect_stdout(sys.stderr):
                frame = scrape_jobs(site_name=[site], search_term=term,
                    location=cfg.get("searchLocation", "Paris, France"), distance=50,
                    country_indeed="France", results_wanted=min(cfg.get("resultsPerQuery", 30), 50),
                    hours_old=min(cfg.get("hoursOld", 168), 720), fetch_description=False, verbose=0)
            errors = [{"token": site, "reason": str(value)[:300]} for value in frame.attrs.get("errors", {}).values()]
            records = json.loads(frame.to_json(orient="records", date_format="iso"))
            for row in records:
                if not row.get("title") or not row.get("job_url"): continue
                location = row.get("location") or ""
                if isinstance(location, dict): location = ", ".join(str(location[key]) for key in ["city", "state", "country"] if location.get(key))
                jobs[row["job_url"]] = {"title": row["title"], "company": row.get("company") or "Not specified",
                    "location": location, "description": row.get("description") or "", "url": row["job_url"],
                    "postedDate": None if site == "hellowork" else row.get("date_posted"), "postedDatePrecision": "day", "postedDateKind": "platform",
                    "employmentType": row.get("job_type") or "", "isRemote": bool(row.get("is_remote")), "sourceBoard": site}
        except Exception as exc:
            errors = [{"token": site, "reason": str(exc)[:300]}]
        if attempt == 0 and transient_error(errors):
            import time
            time.sleep(1)
            continue
        break
    return {"jobs": list(jobs.values()), "errors": errors}

def main():
    cfg = json.load(sys.stdin)
    sites = list(dict.fromkeys(cfg.get("sites", [])))
    terms = list(dict.fromkeys(cfg.get("searchTerms", [])))
    if not sites or not terms or len(sites) > 4 or len(terms) > 3 or not set(sites).issubset(ALLOWED):
        raise ValueError("Invalid source or search terms")
    # One request stream per source, sequential queries per source. This avoids
    # bursting multiple queries at the same platform concurrently.
    def search_site(site):
        results = []
        for term in terms:
            result = search_one((site, term, cfg)); results.append(result)
            if result["errors"]: break
        return results
    with ThreadPoolExecutor(max_workers=2) as pool:
        groups = list(pool.map(search_site, sites))
    results = [result for group in groups for result in group]
    jobs = {job["url"]: job for result in results for job in result["jobs"]}
    errors = {item["token"]: item for result in results for item in result["errors"]}
    health = [{"id": site, "jobCount": sum(job["sourceBoard"] == site for job in jobs.values()), "status": "partial" if site in errors and any(job["sourceBoard"] == site for job in jobs.values()) else "failed" if site in errors else "ok" if any(job["sourceBoard"] == site for job in jobs.values()) else "empty", "checkedAt": datetime.now(timezone.utc).isoformat(), "message": errors.get(site, {}).get("reason")} for site in sites]
    json.dump({"jobs": list(jobs.values()), "errors": list(errors.values()), "sourceHealth": health}, sys.__stdout__)

if __name__ == "__main__":
    main()
