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
            critical = {
                "profile": {
                    "name": data.get("profile", {}).get("name"),
                    "skills": data.get("profile", {}).get("skills"),
                    "projects": data.get("profile", {}).get("projects"),
                    "certifications": data.get("profile", {}).get("certifications", []),
                    "summary": data.get("profile", {}).get("summary", "")
                },
                "processed_urls": data.get("processed_urls", [])
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
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7
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
            result_data = json.loads(content)

            result_data["timestamp"] = datetime.now().isoformat()
            result_data["candidate_name"] = candidate_name

            return result_data

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse API response: {str(e)}")
        except KeyError as e:
            raise Exception(f"Unexpected API response format: {str(e)}")


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
