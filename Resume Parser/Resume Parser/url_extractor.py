"""
HireMind - URL Extractor Module
Extracts candidate data from GitHub, LinkedIn, HackerRank, and portfolio websites.
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urlparse

# ─── Browser-like headers to bypass basic bot detection ───────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


# ══════════════════════════════════════════════════════════════════════════════
# 1. GITHUB EXTRACTOR  (uses official REST API — most reliable)
# ══════════════════════════════════════════════════════════════════════════════

def extract_github(github_url: str, token: Optional[str] = None) -> dict:
    """
    Extract full GitHub profile data using the GitHub REST API.
    Pass a personal access token to avoid rate limits (5000 req/hr vs 60/hr).

    Args:
        github_url: e.g. "https://github.com/udaykumar5683"
        token: GitHub personal access token (optional but recommended)
    """
    username = github_url.rstrip("/").split("/")[-1]
    base = "https://api.github.com"
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    def get(url):
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        return r.json()

    try:
        profile = get(f"{base}/users/{username}")
        repos_raw = get(f"{base}/users/{username}/repos?per_page=100&sort=updated")

        # Languages used across all repos
        lang_counts: dict[str, int] = {}
        for repo in repos_raw:
            if repo.get("language"):
                lang_counts[repo["language"]] = lang_counts.get(repo["language"], 0) + 1

        repos = [
            {
                "name": r["name"],
                "description": r.get("description"),
                "language": r.get("language"),
                "stars": r["stargazers_count"],
                "forks": r["forks_count"],
                "topics": r.get("topics", []),
                "url": r["html_url"],
                "created_at": r["created_at"][:10],
                "updated_at": r["updated_at"][:10],
            }
            for r in repos_raw
        ]

        return {
            "source": "github",
            "username": username,
            "name": profile.get("name"),
            "bio": profile.get("bio"),
            "location": profile.get("location"),
            "blog": profile.get("blog"),
            "public_repos": profile.get("public_repos"),
            "followers": profile.get("followers"),
            "following": profile.get("following"),
            "account_created": profile.get("created_at", "")[:10],
            "languages_used": lang_counts,
            "top_languages": sorted(lang_counts, key=lang_counts.get, reverse=True)[:5],
            "repositories": repos,
            "pinned_count": len([r for r in repos if r["stars"] > 0]),
            "total_stars": sum(r["stars"] for r in repos),
        }

    except Exception as e:
        return {"source": "github", "error": str(e), "username": username}


# ══════════════════════════════════════════════════════════════════════════════
# 2. HACKERRANK EXTRACTOR  (unofficial REST API — works without login)
# ══════════════════════════════════════════════════════════════════════════════

def extract_hackerrank(hackerrank_url: str) -> dict:
    """
    Extract HackerRank profile: badges, scores, solved problems.
    Uses HackerRank's undocumented but public REST API.

    Args:
        hackerrank_url: e.g. "https://www.hackerrank.com/profile/username"
    """
    username = hackerrank_url.rstrip("/").split("/")[-1]
    base = "https://www.hackerrank.com/rest"
    headers = {**HEADERS, "Accept": "application/json"}

    result = {"source": "hackerrank", "username": username}

    try:
        # Profile info
        profile_r = requests.get(
            f"{base}/contests/master/hackers/{username}/profile",
            headers=headers, timeout=10
        )
        if profile_r.status_code == 200:
            profile_data = profile_r.json().get("model", {})
            result.update({
                "name": profile_data.get("name"),
                "country": profile_data.get("country"),
                "school": profile_data.get("school"),
                "level": profile_data.get("level"),
                "points": profile_data.get("points"),
            })
    except Exception as e:
        result["profile_error"] = str(e)

    try:
        # Badges (Python, SQL, Algorithms, etc.)
        badges_r = requests.get(
            f"{base}/hackers/{username}/badges",
            headers=headers, timeout=10
        )
        if badges_r.status_code == 200:
            badges_data = badges_r.json().get("models", [])
            result["badges"] = [
                {
                    "name": b.get("badge_name"),
                    "stars": b.get("stars"),
                    "solved": b.get("solved"),
                }
                for b in badges_data
            ]
    except Exception as e:
        result["badges_error"] = str(e)

    try:
        # ELO scores per track
        scores_r = requests.get(
            f"{base}/hackers/{username}/scores_elo",
            headers=headers, timeout=10
        )
        if scores_r.status_code == 200:
            result["track_scores"] = scores_r.json()
    except Exception as e:
        result["scores_error"] = str(e)

    try:
        # Submission stats
        submissions_r = requests.get(
            f"{base}/hackers/{username}/submission_stats",
            headers=headers, timeout=10
        )
        if submissions_r.status_code == 200:
            result["submission_stats"] = submissions_r.json()
    except Exception as e:
        result["submissions_error"] = str(e)

    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3. LEETCODE EXTRACTOR (uses GraphQL API — primary method)
# ══════════════════════════════════════════════════════════════════════════════

def extract_leetcode_graphql(leetcode_url: str) -> dict:
    """
    Extract LeetCode profile data using the official GraphQL API.
    Args:
        leetcode_url: e.g. "https://leetcode.com/u/udaykumar5683/"
    """
    # Extract username from URL
    path_parts = urlparse(leetcode_url).path.rstrip("/").split("/")
    username = path_parts[-1] if path_parts and path_parts[-1] else None
    if not username:
        return {
            "source": "leetcode",
            "status": "failed",
            "method_attempted": "graphql",
            "error_message": "Could not extract username from URL"
        }
    
    result = {
        "source": "leetcode",
        "username": username
    }
    
    # GraphQL endpoint and query
    graphql_url = "https://leetcode.com/graphql"
    query = """
    query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                realName
                aboutMe
                userAvatar
                ranking
                reputation
                school
                websites
                countryName
                company
                jobTitle
                skillTags
                starRating
            }
            submitStats {
                acSubmissionNum {
                    difficulty
                    count
                    submissions
                }
                totalSubmissionNum {
                    difficulty
                    count
                    submissions
                }
            }
            languageProblemCount {
                languageName
                problemsSolved
            }
            badges {
                name
                icon
            }
        }
        recentAcSubmissionList(username: $username, limit: 20) {
            title
            titleSlug
            timestamp
            lang
        }
    }
    """
    
    try:
        response = requests.post(
            graphql_url,
            json={
                "query": query,
                "variables": {"username": username}
            },
            headers={
                **HEADERS,
                "Content-Type": "application/json",
                "Referer": f"https://leetcode.com/u/{username}/"
            },
            timeout=15
        )
        response.raise_for_status()
        data = response.json()
        
        if data.get("data", {}).get("matchedUser"):
            user_data = data["data"]["matchedUser"]
            result["status"] = "success"
            result["method_attempted"] = "graphql"
            
            # Profile info
            profile = user_data.get("profile", {})
            result["profile"] = {
                "real_name": profile.get("realName"),
                "about": profile.get("aboutMe"),
                "avatar": profile.get("userAvatar"),
                "ranking": profile.get("ranking"),
                "reputation": profile.get("reputation"),
                "school": profile.get("school"),
                "websites": profile.get("websites"),
                "country": profile.get("countryName"),
                "company": profile.get("company"),
                "job_title": profile.get("jobTitle"),
                "skills": profile.get("skillTags"),
                "star_rating": profile.get("starRating")
            }
            
            # Solved problems
            submit_stats = user_data.get("submitStats", {})
            ac_submissions = submit_stats.get("acSubmissionNum", [])
            total_submissions = submit_stats.get("totalSubmissionNum", [])
            
            easy = medium = hard = total = 0
            easy_sub = medium_sub = hard_sub = total_sub = 0
            
            for item in ac_submissions:
                if item["difficulty"] == "Easy":
                    easy = item["count"]
                    easy_sub = item["submissions"]
                elif item["difficulty"] == "Medium":
                    medium = item["count"]
                    medium_sub = item["submissions"]
                elif item["difficulty"] == "Hard":
                    hard = item["count"]
                    hard_sub = item["submissions"]
                elif item["difficulty"] == "All":
                    total = item["count"]
                    total_sub = item["submissions"]
            
            result["problems_solved"] = {
                "total": total,
                "easy": easy,
                "medium": medium,
                "hard": hard
            }
            
            # Acceptance rate
            if total_sub > 0:
                result["acceptance_rate"] = round((total / total_sub) * 100, 2)
            
            # Language stats
            result["language_statistics"] = user_data.get("languageProblemCount", [])
            
            # Badges
            result["badges"] = [
                {
                    "name": b.get("name"),
                    "icon": b.get("icon")
                }
                for b in user_data.get("badges", [])
            ]
            
            # Recent submissions from the second query
            if data.get("data", {}).get("recentAcSubmissionList"):
                result["recent_submissions"] = data["data"]["recentAcSubmissionList"]
            
            return result
        else:
            result["status"] = "failed"
            result["method_attempted"] = "graphql"
            result["error_message"] = "User not found or profile is private"
            return result
            
    except Exception as e:
        result["status"] = "failed"
        result["method_attempted"] = "graphql"
        result["error_message"] = str(e)
        return result


def extract_leetcode(leetcode_url: str) -> dict:
    """
    Main LeetCode extractor with fallback workflow.
    Step 1: Try GraphQL API (primary)
    Step 2: If fails, try HTML/Playwright fallback
    """
    # First try GraphQL
    graphql_result = extract_leetcode_graphql(leetcode_url)
    
    if graphql_result.get("status") == "success":
        return graphql_result
    
    # If GraphQL failed, try HTML/Playwright fallback
    try:
        from playwright.sync_api import sync_playwright
        
        result = {
            "source": "leetcode",
            "status": "failed",
            "method_attempted": "playwright"
        }
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(extra_http_headers=dict(HEADERS))
            page.goto(leetcode_url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(2000)
            html_content = page.content()
            browser.close()
        
        soup = BeautifulSoup(html_content, "lxml")
        result["raw_html"] = html_content[:5000]  # Store raw HTML snippet
        result["status"] = "success"
        result["method_attempted"] = "playwright"
        
        return result
        
    except Exception as e:
        return {
            "source": "leetcode",
            "status": "failed",
            "method_attempted": "playwright",
            "error_message": str(e)
        }


# ══════════════════════════════════════════════════════════════════════════════
# 4. PORTFOLIO / PERSONAL WEBSITE EXTRACTOR  (BeautifulSoup scraper)
# ══════════════════════════════════════════════════════════════════════════════

def extract_portfolio(portfolio_url: str) -> dict:
    """
    Extract text content from a personal portfolio or any website.
    Cleans HTML and returns structured sections. Falls back to Playwright for JS-rendered content.

    Args:
        portfolio_url: e.g. "https://uday-portfolio-brown.vercel.app/"
    """
    result = {"source": "portfolio", "url": portfolio_url}
    html_content = None

    try:
        # First attempt with requests + BeautifulSoup
        r = requests.get(portfolio_url, headers=HEADERS, timeout=15, allow_redirects=True)
        r.raise_for_status()
        html_content = r.text
    except requests.exceptions.SSLError:
        # Try without SSL verification as fallback
        try:
            r = requests.get(portfolio_url, headers=HEADERS, timeout=15, verify=False)
            html_content = r.text
            result["ssl_warning"] = "Extracted without SSL verification"
        except Exception as e:
            pass
    except Exception as e:
        pass

    # Check if we got valid content or need to use Playwright fallback
    use_playwright = False
    if html_content:
        # Check if it's just a minimal JS shell
        soup = BeautifulSoup(html_content, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "head", "meta", "noscript"]):
            tag.decompose()
        raw_text = soup.get_text(separator="\n", strip=True)
        clean_lines = [l for l in raw_text.splitlines() if l.strip()]
        if len(clean_lines) < 2:
            use_playwright = True
    else:
        use_playwright = True

    if use_playwright:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(extra_http_headers=dict(HEADERS))
                page.goto(portfolio_url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(3000)  # Wait 3 seconds for JS to render
                html_content = page.content()
                browser.close()
            result["playwright_used"] = True
        except ImportError:
            result["playwright_error"] = "Playwright not installed"
        except Exception as e:
            result["playwright_error"] = str(e)

    # Parse with BeautifulSoup
    if html_content:
        try:
            soup = BeautifulSoup(html_content, "lxml")

            # Remove noise
            for tag in soup(["script", "style", "nav", "footer", "head", "meta", "noscript"]):
                tag.decompose()

            # Page title
            result["title"] = soup.title.string.strip() if soup.title else None

            # Meta description
            meta_desc = soup.find("meta", attrs={"name": "description"})
            result["meta_description"] = meta_desc["content"] if meta_desc else None

            # All headings → section structure
            headings = [
                {"level": tag.name, "text": tag.get_text(strip=True)}
                for tag in soup.find_all(["h1", "h2", "h3"])
                if tag.get_text(strip=True)
            ]
            result["sections"] = headings

            # Full clean text
            raw_text = soup.get_text(separator="\n", strip=True)
            # Remove excessive blank lines
            clean_lines = [l for l in raw_text.splitlines() if l.strip()]
            result["full_text"] = "\n".join(clean_lines)

            # Extract emails and social links
            emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", html_content)
            result["emails_found"] = list(set(emails))

            links = [
                a["href"] for a in soup.find_all("a", href=True)
                if any(s in a["href"] for s in ["github", "linkedin", "twitter", "leetcode", "hackerrank"])
            ]
            result["social_links_found"] = list(set(links))

            return result
        except Exception as e:
            result["error"] = str(e)
    else:
        result["error"] = "Failed to retrieve HTML content"

    return result


# ══════════════════════════════════════════════════════════════════════════════
# 4. LINKEDIN EXTRACTOR
# NOTE: LinkedIn aggressively blocks scraping. Two approaches below:
#   A) Best effort HTML scrape (works sometimes, often blocked)
#   B) Proxycurl API (paid, ~$0.01/request — recommended for production)
# ══════════════════════════════════════════════════════════════════════════════

def extract_linkedin_scrape(linkedin_url: str) -> dict:
    """
    Attempt to scrape LinkedIn public profile HTML.
    Success rate varies — LinkedIn actively blocks bots.
    Use extract_linkedin_proxycurl() for reliable production use.
    """
    result = {"source": "linkedin", "url": linkedin_url}

    session = requests.Session()
    # Visit homepage first to get cookies (mimics real browser behavior)
    try:
        session.get("https://www.linkedin.com", headers=HEADERS, timeout=10)
        time.sleep(1)

        r = session.get(linkedin_url, headers={
            **HEADERS,
            "Referer": "https://www.linkedin.com/",
        }, timeout=15)

        if r.status_code == 999 or r.status_code == 403:
            result["error"] = "LinkedIn blocked the request (status 999/403). Use Proxycurl API instead."
            return result

        soup = BeautifulSoup(r.text, "lxml")

        # Try extracting from meta tags (available even when JS-rendered content isn't)
        og_title = soup.find("meta", property="og:title")
        og_desc = soup.find("meta", property="og:description")
        result["name"] = og_title["content"] if og_title else None
        result["headline"] = og_desc["content"] if og_desc else None

        # Profile sections (works on some public profiles)
        name_tag = soup.find("h1")
        if name_tag:
            result["name"] = name_tag.get_text(strip=True)

        for section in soup.find_all("section"):
            section_id = section.get("id", "") or section.get("class", [""])[0]
            text = section.get_text(separator=" ", strip=True)
            if text:
                result[f"section_{section_id}"] = text[:500]

        return result

    except Exception as e:
        return {"source": "linkedin", "url": linkedin_url, "error": str(e)}


def extract_linkedin_proxycurl(linkedin_url: str, api_key: str) -> dict:
    """
    Extract LinkedIn profile using Proxycurl API (most reliable method).
    Sign up at https://nubela.co/proxycurl — free trial available.

    Args:
        linkedin_url: Full LinkedIn profile URL
        api_key: Your Proxycurl API key
    """
    try:
        r = requests.get(
            "https://nubela.co/proxycurl/api/v2/linkedin",
            params={"url": linkedin_url},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30
        )
        r.raise_for_status()
        data = r.json()

        return {
            "source": "linkedin",
            "url": linkedin_url,
            "name": f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
            "headline": data.get("headline"),
            "summary": data.get("summary"),
            "location": data.get("city"),
            "connections": data.get("connections"),
            "experiences": [
                {
                    "company": e.get("company"),
                    "title": e.get("title"),
                    "duration": e.get("description"),
                    "starts_at": e.get("starts_at"),
                    "ends_at": e.get("ends_at"),
                }
                for e in (data.get("experiences") or [])
            ],
            "education": [
                {
                    "school": e.get("school"),
                    "degree": e.get("degree_name"),
                    "field": e.get("field_of_study"),
                }
                for e in (data.get("education") or [])
            ],
            "skills": data.get("skills", []),
            "certifications": [c.get("name") for c in (data.get("certifications") or [])],
        }

    except Exception as e:
        return {"source": "linkedin", "url": linkedin_url, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# 5. SMART URL ROUTER  (auto-detects which extractor to call)
# ══════════════════════════════════════════════════════════════════════════════

def extract_url(
    url: str,
    github_token: Optional[str] = None,
    proxycurl_key: Optional[str] = None
) -> dict:
    """
    Auto-detect the URL type and call the right extractor.

    Args:
        url: Any candidate URL
        github_token: Optional GitHub personal access token
        proxycurl_key: Optional Proxycurl API key for LinkedIn
    """
    domain = urlparse(url).netloc.lower()

    if "github.com" in domain:
        return extract_github(url, token=github_token)

    elif "linkedin.com" in domain:
        if proxycurl_key:
            return extract_linkedin_proxycurl(url, proxycurl_key)
        else:
            return extract_linkedin_scrape(url)

    elif "hackerrank.com" in domain:
        return extract_hackerrank(url)
    
    elif "leetcode.com" in domain:
        return extract_leetcode(url)

    else:
        # Generic portfolio / website
        return extract_portfolio(url)


# ══════════════════════════════════════════════════════════════════════════════
# 6. BULK EXTRACTOR  (run all candidate URLs at once)
# ══════════════════════════════════════════════════════════════════════════════

def extract_all_urls(
    urls: list[str],
    github_token: Optional[str] = None,
    proxycurl_key: Optional[str] = None
) -> dict:
    """
    Extract data from all candidate URLs and return a combined dict.

    Args:
        urls: List of URLs from the candidate's profile
        github_token: Optional GitHub token
        proxycurl_key: Optional Proxycurl API key
    """
    results = {}
    for url in urls:
        if not url:
            continue
        print(f"  Extracting: {url}")
        data = extract_url(url, github_token=github_token, proxycurl_key=proxycurl_key)
        source = data.get("source", "unknown")
        results[source] = data
        time.sleep(0.5)  # Be polite — avoid hammering servers

    return results


# ══════════════════════════════════════════════════════════════════════════════
# USAGE EXAMPLE
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    candidate_urls = [
        "https://github.com/udaykumar5683",
        "https://www.linkedin.com/in/udaykumargudagudi/",
        "https://www.hackerrank.com/profile/udaykumargudagu1",
        "https://leetcode.com/u/udaykumar5683/",
        "https://uday-portfolio-brown.vercel.app/",
    ]

    print("=" * 60)
    print("HireMind URL Extractor")
    print("=" * 60)

    # Set your tokens here (or pass via env vars)
    GITHUB_TOKEN = None        # Set to "ghp_xxxx" for higher rate limits
    PROXYCURL_KEY = None       # Set to use Proxycurl for LinkedIn

    all_data = extract_all_urls(
        candidate_urls,
        github_token=GITHUB_TOKEN,
        proxycurl_key=PROXYCURL_KEY
    )

    print("\n" + "=" * 60)
    print("EXTRACTED DATA SUMMARY")
    print("=" * 60)
    for source, data in all_data.items():
        print(f"\n[{source.upper()}]")
        if "error" in data:
            print(f"  ERROR: {data['error']}")
        elif "status" in data and data["status"] == "failed":
            print(f"  ERROR: {data.get('error_message', 'Unknown error')}")
            print(f"  Method attempted: {data.get('method_attempted')}")
        else:
            for key, val in data.items():
                if key not in ["full_text", "repositories", "source", "raw_html"]:
                    print(f"  {key}: {val}")
