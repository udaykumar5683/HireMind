#!/usr/bin/env python3
"""
Project Authenticity System (Agent 5) for HireMind Platform
The truth checker of the entire pipeline.
"""

import json
import os
from typing import Dict, List, Any
from pathlib import Path
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")


class ProjectAuthenticityChecker:
    def __init__(self, groq_api_key: str):
        self.api_key = groq_api_key
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    def check_authenticity(
        self,
        agent1_data: Dict[str, Any],
        agent2_data: Dict[str, Any],
        agent3_data: Dict[str, Any],
        agent4_data: Dict[str, Any],
        candidate_name: str
    ) -> Dict[str, Any]:
        """
        Cross-check all agent outputs and deliver a final authenticity verdict.
        """

        system_prompt = """You are Agent 5 of HireMind, a cross-agent truth verification system. You receive detailed outputs of 4 previous AI agents. Your job is to cross-reference all data, detect conflicts and inconsistencies, and deliver a final authenticity verdict on the candidate's projects and claims. Be thorough, objective, and evidence-based. Flag conflicts clearly. Help recruiters know exactly what to trust and what to probe. Return only valid JSON, no markdown fences."""

        output_schema = {
            "timestamp": "ISO 8601 timestamp string",
            "candidate_name": "string",
            "overall_authenticity_score": 0,
            "verdict": "",
            "verdict_level": "",
            "projects": [
                {
                    "project_name": "",
                    "authenticity_score": 0,
                    "genuinely_built": True,
                    "ai_assistance_level": "",
                    "complexity_match": "",
                    "impact_score": 0,
                    "commit_evidence": "",
                    "red_flags": [],
                    "green_flags": [],
                    "final_verdict": ""
                }
            ],
            "cross_agent_conflicts": [
                {
                    "conflict_type": "",
                    "agent_a": "",
                    "agent_b": "",
                    "description": "",
                    "severity": ""
                }
            ],
            "skill_claim_accuracy": 0,
            "profile_consistency_score": 0,
            "trust_recommendation": "",
            "recruiter_alert": "",
            "recruiter_summary": ""
        }

        # Extract key data from agent outputs (including full verified projects/skills)
        def extract_agent1(data):
            cleaned_urls = [
                {
                    "name": url.get("name", "") if isinstance(url, dict) else str(url),
                    "type": url.get("type", "") if isinstance(url, dict) else ""
                }
                for url in (data.get("processed_urls", [])[:10]) if isinstance(url, (dict, str))
            ]
            critical = {
                "profile": {
                    "name": data.get("profile", {}).get("name"),
                    "skills": data.get("profile", {}).get("skills"),
                    "projects": data.get("profile", {}).get("projects"),
                    "certifications": data.get("profile", {}).get("certifications", []),
                    "summary": data.get("profile", {}).get("summary", "")
                },
                "processed_urls": cleaned_urls
            }
            return critical

        def extract_agent2(data):
            critical = {
                "overall_score": data.get("overall_score"),
                "verified_skills": data.get("verified_skills", []),
                "partially_verified_skills": data.get("partially_verified_skills", []),
                "unverified_skills": data.get("unverified_skills", []),
                "verified_projects": data.get("verified_projects", []),
                "risk_flags": data.get("risk_flags", [])
            }
            return critical

        def extract_agent3(data):
            critical = {
                "candidate_strength_score": data.get("candidate_strength_score"),
                "hidden_skills": data.get("hidden_skills", []),
                "project_authenticity": data.get("project_authenticity", []),
                "ai_usage_estimation": data.get("ai_usage_estimation", [])
            }
            return critical

        def extract_agent4(data):
            critical = {
                "candidate_name": data.get("candidate_name"),
                "overall_strength_score": data.get("overall_strength_score"),
                "top_roles": data.get("top_roles", [])
            }
            return critical

        agent1_clean = extract_agent1(agent1_data)
        agent2_clean = extract_agent2(agent2_data)
        agent3_clean = extract_agent3(agent3_data)
        agent4_clean = extract_agent4(agent4_data)

        user_prompt = f"""Analyze the following agent outputs and return a complete project authenticity report.

AGENT 1 (Candidate Profile):
{json.dumps(agent1_clean)}

AGENT 2 (Evidence Verification):
{json.dumps(agent2_clean)}

AGENT 3 (Hidden Skills/Project Authenticity):
{json.dumps(agent3_clean)}

AGENT 4 (Best Roles):
{json.dumps(agent4_clean)}

Return ONLY this JSON:
{json.dumps(output_schema)}

CRITICAL RULES FOR PROJECT AUTHENTICITY SCORING:
- Before scoring any project, you MUST first check Agent 2's verified_projects list
- For each project in candidate's profile:
  - Look for a matching entry in verified_projects[] where verification_status = "verified"
  - If found AND supporting_sources contains "github", that project HAS GitHub evidence → NEVER say "No GitHub evidence"
  - Set authenticity_score minimum 70 for github-verified projects
  - Set genuinely_built = true for github-verified projects
  - Set ai_assistance_level = "Low" unless description explicitly mentions AI tools used to build it
- Only mark a project as "No GitHub evidence" if it does NOT appear in verified_projects[] at all OR if supporting_sources is empty
- cross_agent_conflicts only flag conflicts if data actually contradicts → do NOT flag "verified_skills count is 0" if partially_verified_skills is non-empty; check actual lists

verdict_level options: "Highly Authentic" / "Mostly Authentic" / "Partially Authentic" / "Suspicious"
ai_assistance_level options: "None" / "Low" / "Medium" / "High"
complexity_match options: "Underclaimed" / "Matches" / "Overclaimed"
conflict severity options: "low" / "medium" / "high" / "critical"
- recruiter_summary must be written for a busy HR manager, max 4 sentences
"""

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": "openai/gpt-oss-120b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 4000,
            "temperature": 0.1
        }

        try:
            session = requests.Session()
            retries = Retry(
                total=3,
                backoff_factor=1,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=["POST"]
            )
            session.mount("https://", HTTPAdapter(max_retries=retries))

            response = session.post(self.api_url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()

            content = result["choices"][0]["message"]["content"]
            content = content.replace("```json", "").replace("```", "").strip()

            first_brace = content.find('{')
            last_brace = content.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                content = content[first_brace:last_brace+1]

            try:
                result_data = json.loads(content)
            except Exception:
                import re
                sanitized = re.sub(r',\s*([}\]])', r'\1', content)
                sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', sanitized)
                result_data = json.loads(sanitized)

            result_data["timestamp"] = datetime.now().isoformat()
            result_data["candidate_name"] = candidate_name

            return sanitize_agent5_output(result_data, candidate_name)

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse API response: {str(e)}")
        except KeyError as e:
            raise Exception(f"Unexpected API response format: {str(e)}")


def sanitize_agent5_output(data: Dict[str, Any], candidate_name: str) -> Dict[str, Any]:
    """
    Validates, sanitizes, and enforces data types, nesting levels, key names, and mandatory fields
    for Agent 5 (Project Authenticity System).
    """
    if not isinstance(data, dict):
        data = {}

    def to_int(val, default=0, min_val=0, max_val=100):
        try:
            if isinstance(val, (int, float)):
                i = int(val)
            elif isinstance(val, str):
                clean_str = val.replace('%', '').strip()
                i = int(float(clean_str))
            else:
                i = default
            return max(min_val, min(max_val, i))
        except (ValueError, TypeError):
            return default

    def to_bool(val, default=True):
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            return val.lower() in ("true", "yes", "1", "verified", "authentic")
        return bool(val) if val is not None else default

    def to_str(val, default=""):
        if val is None:
            return default
        return str(val).strip()

    def to_list_of_strs(val):
        if isinstance(val, list):
            return [str(item).strip() for item in val if item is not None and str(item).strip()]
        if isinstance(val, str) and val.strip():
            return [val.strip()]
        return []

    # 1. Top level fields
    overall_score = to_int(data.get("overall_authenticity_score"), default=75)

    verdict = to_str(data.get("verdict"))
    if not verdict:
        verdict = "Authentic" if overall_score >= 70 else "Partially Authentic" if overall_score >= 50 else "Suspicious"

    verdict_level = to_str(data.get("verdict_level"))
    valid_levels = ["Highly Authentic", "Mostly Authentic", "Partially Authentic", "Suspicious"]
    if verdict_level not in valid_levels:
        if overall_score >= 85:
            verdict_level = "Highly Authentic"
        elif overall_score >= 70:
            verdict_level = "Mostly Authentic"
        elif overall_score >= 50:
            verdict_level = "Partially Authentic"
        else:
            verdict_level = "Suspicious"

    # 2. Projects list
    raw_projects = data.get("projects")
    sanitized_projects = []
    if isinstance(raw_projects, list):
        for proj in raw_projects:
            if not isinstance(proj, dict):
                continue
            p_name = to_str(proj.get("project_name") or proj.get("name"), default="Unnamed Project")
            p_score = to_int(proj.get("authenticity_score"), default=overall_score)
            p_built = to_bool(proj.get("genuinely_built"), default=True)

            ai_level = to_str(proj.get("ai_assistance_level"), default="Low")
            if ai_level.capitalize() in ["None", "Low", "Medium", "High"]:
                ai_level = ai_level.capitalize()
            else:
                ai_level = "Low"

            comp_match = to_str(proj.get("complexity_match"), default="Matches")
            if comp_match.capitalize() in ["Underclaimed", "Matches", "Overclaimed"]:
                comp_match = comp_match.capitalize()
            else:
                comp_match = "Matches"

            p_impact = to_int(proj.get("impact_score"), default=75)
            commit_ev = to_str(proj.get("commit_evidence"), default="Evidence verified")
            red_flags = to_list_of_strs(proj.get("red_flags"))
            green_flags = to_list_of_strs(proj.get("green_flags"))

            p_verdict = to_str(proj.get("final_verdict"))
            if not p_verdict:
                p_verdict = "Authentic" if p_score >= 70 else "Partially Authentic" if p_score >= 50 else "Suspicious"

            sanitized_projects.append({
                "project_name": p_name,
                "authenticity_score": p_score,
                "genuinely_built": p_built,
                "ai_assistance_level": ai_level,
                "complexity_match": comp_match,
                "impact_score": p_impact,
                "commit_evidence": commit_ev,
                "red_flags": red_flags,
                "green_flags": green_flags,
                "final_verdict": p_verdict
            })

    # 3. Cross agent conflicts list
    raw_conflicts = data.get("cross_agent_conflicts")
    sanitized_conflicts = []
    if isinstance(raw_conflicts, list):
        for conf in raw_conflicts:
            if not isinstance(conf, dict):
                continue
            c_type = to_str(conf.get("conflict_type"), default="Data Discrepancy")
            a_a = to_str(conf.get("agent_a"), default="Agent Output")
            a_b = to_str(conf.get("agent_b"), default="Evidence Output")
            desc = to_str(conf.get("description"), default="Discrepancy detected between candidate claims and source evidence.")

            sev = to_str(conf.get("severity"), default="medium").lower()
            if sev not in ["low", "medium", "high", "critical"]:
                sev = "medium"

            sanitized_conflicts.append({
                "conflict_type": c_type,
                "agent_a": a_a,
                "agent_b": a_b,
                "description": desc,
                "severity": sev
            })

    skill_accuracy = to_int(data.get("skill_claim_accuracy"), default=80)
    consistency_score = to_int(data.get("profile_consistency_score"), default=85)

    trust_rec = to_str(data.get("trust_recommendation"))
    if not trust_rec:
        trust_rec = "Recommended for Hire" if overall_score >= 75 else "Interview Verification Advised"

    rec_alert = to_str(data.get("recruiter_alert"), default="")
    rec_summary = to_str(data.get("recruiter_summary"))
    if not rec_summary:
        rec_summary = f"Candidate {candidate_name} exhibits an overall authenticity score of {overall_score}/100 with {len(sanitized_projects)} verified projects and {len(sanitized_conflicts)} risk flags."

    timestamp = to_str(data.get("timestamp")) or datetime.now().isoformat()

    return {
        "timestamp": timestamp,
        "candidate_name": candidate_name,
        "overall_authenticity_score": overall_score,
        "verdict": verdict,
        "verdict_level": verdict_level,
        "projects": sanitized_projects,
        "cross_agent_conflicts": sanitized_conflicts,
        "skill_claim_accuracy": skill_accuracy,
        "profile_consistency_score": consistency_score,
        "trust_recommendation": trust_rec,
        "recruiter_alert": rec_alert,
        "recruiter_summary": rec_summary
    }


def find_matching_files(base_dir: Path, name_part: str) -> Dict[str, Path]:
    """Find matching files for a candidate across agent directories."""
    files = {
        "agent1": None,
        "agent2": None,
        "agent3": None,
        "agent4": None
    }

    # Find Agent 1 (profile) file
    agent1_dir = base_dir / "agent1_output"
    for f in agent1_dir.glob("profile_*.json"):
        if name_part in f.name:
            files["agent1"] = f
            break

    # Find Agent 2 (verification) file
    agent2_dir = base_dir / "agent2_output"
    for f in agent2_dir.glob("verification_profile_*.json"):
        if name_part in f.name:
            files["agent2"] = f
            break

    # Find Agent 3 (hidden skills) file
    agent3_dir = base_dir / "agent3_output"
    for f in agent3_dir.glob("hidden_skill_*.json"):
        if name_part in f.name:
            files["agent3"] = f
            break

    # Find Agent 4 (best roles) file
    agent4_dir = base_dir / "agent4_output"
    for f in agent4_dir.glob("best_roles_*.json"):
        if name_part in f.name:
            files["agent4"] = f
            break

    return files


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Project Authenticity System (Agent 5)")
    parser.add_argument("--api-key", help="Groq API key (defaults to VITE_GROQ_API_KEY from .env)")
    parser.add_argument("--name-part", required=True, help="Candidate name part to match files (e.g., 'uday')")
    parser.add_argument("--database-dir", default="e:/Resume Parser/Database", help="Base database directory")
    parser.add_argument("--output-dir", default="e:/Resume Parser/Database/agent5_output", help="Directory to save authenticity reports")

    args = parser.parse_args()

    # Get API key from args or environment
    api_key = args.api_key or os.getenv("VITE_GROQ_API_KEY")
    if not api_key:
        print("Error: Groq API key not provided. Use --api-key or set VITE_GROQ_API_KEY in .env")
        return

    base_dir = Path(args.database_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True, parents=True)

    # Find matching files
    files = find_matching_files(base_dir, args.name_part)

    # Check all files exist
    if not all(files.values()):
        missing = [name for name, path in files.items() if path is None]
        print(f"Error: Missing input files from: {', '.join(missing)}")
        return

    print(f"\nProcessing candidate: {args.name_part}")
    print(f"Agent 1 input: {files['agent1']}")
    print(f"Agent 2 input: {files['agent2']}")
    print(f"Agent 3 input: {files['agent3']}")
    print(f"Agent 4 input: {files['agent4']}")

    # Load all agent data
    with open(files["agent1"], "r", encoding="utf-8") as f:
        agent1_data = json.load(f)
    with open(files["agent2"], "r", encoding="utf-8") as f:
        agent2_data = json.load(f)
    with open(files["agent3"], "r", encoding="utf-8") as f:
        agent3_data = json.load(f)
    with open(files["agent4"], "r", encoding="utf-8") as f:
        agent4_data = json.load(f)

    checker = ProjectAuthenticityChecker(api_key)

    try:
        report = checker.check_authenticity(
            agent1_data,
            agent2_data,
            agent3_data,
            agent4_data,
            args.name_part
        )

        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"authenticity_report_{args.name_part}_{timestamp}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\nReport saved to: {output_file}")
        print(f"Overall authenticity score: {report['overall_authenticity_score']}")
        print(f"Verdict: {report['verdict']} ({report['verdict_level']})")

    except Exception as e:
        print(f"\nError: {str(e)}")


if __name__ == "__main__":
    main()
