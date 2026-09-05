#!/usr/bin/env python3
"""
Agent 6: Technical Depth Assessment System for HireMind Platform
"""

import json
import os
from pathlib import Path
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


class TechnicalDepthAssessmentAgent:
    def __init__(self, groq_api_key: str):
        self.api_key = groq_api_key
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    def assess_technical_depth(
        self,
        agent1_data: dict,
        agent2_data: dict,
        agent3_data: dict,
        agent4_data: dict,
        agent5_data: dict,
        candidate_name: str
    ) -> dict:
        system_prompt = """You are Agent 6 of HireMind, a technical depth assessment system. 
You receive coding platform evidence (LeetCode, HackerRank) plus prior agent analyses (Agents 1-5). 
Your job is to determine the candidate's REAL technical depth per skill, based on actual 
problem-solving evidence rather than resume claims. Be precise about gaps between 
claimed and evidenced skill levels. Help recruiters know exactly what to test in interviews. 
Return only valid JSON, no markdown fences."""

        output_schema = {
            "timestamp": "ISO 8601 timestamp string",
            "candidate_name": "string",
            "overall_technical_depth_score": 0,
            "skills_assessed": [
                {
                    "skill": "",
                    "claimed_level": "",
                    "evidenced_level": "",
                    "interview_readiness": "",
                    "problem_solving_evidence": {
                        "platform": "",
                        "easy_solved": 0,
                        "medium_solved": 0,
                        "hard_solved": 0,
                        "stars_or_rating": "",
                        "evidence_strength": ""
                    },
                    "level_gap_detected": True,
                    "gap_explanation": "",
                    "recommended_interview_focus": ""
                }
            ],
            "strongest_technical_areas": [],
            "weakest_technical_areas": [],
            "problem_solving_summary": {
                "total_problems_solved": 0,
                "difficulty_distribution": "",
                "consistency_rating": ""
            },
            "interview_recommendation": {
                "suggested_round_type": "",
                "topics_to_test": [],
                "topics_to_avoid_assuming": []
            },
            "recruiter_summary": ""
        }

        # Helper to extract only critical fields from agent data to reduce payload size
        def extract_critical_agent1(data):
            critical = {
                "profile": {
                    "name": data.get("profile", {}).get("name"),
                    "skills": data.get("profile", {}).get("skills"),
                    "projects": data.get("profile", {}).get("projects", []),
                    "certifications": data.get("profile", {}).get("certifications", []),
                    "summary": data.get("profile", {}).get("summary", "")
                },
                "processed_urls": [
                    {
                        "name": url.get("name", ""),
                        "type": url.get("type", "")
                    } 
                    for url in (data.get("processed_urls", [])[:10])
                ]
            }
            return critical

        def extract_critical_agent2(data):
            critical = {
                "overall_score": data.get("overall_score"),
                "verified_skills": data.get("verified_skills", []),
                "partially_verified_skills": data.get("partially_verified_skills", []),
                "verified_projects": data.get("verified_projects", []),
                "risk_flags": data.get("risk_flags", [])
            }
            return critical

        def extract_critical_agent3(data):
            critical = {
                "candidate_strength_score": data.get("candidate_strength_score"),
                "top_strengths": data.get("top_strengths", []),
                "hidden_skills": data.get("hidden_skills", [])[:15],
                "ai_usage_estimation": data.get("ai_usage_estimation", {})
            }
            return critical

        def extract_critical_agent4(data):
            critical = {
                "candidate_name": data.get("candidate_name"),
                "overall_strength_score": data.get("overall_strength_score"),
                "top_recommended_roles": data.get("top_recommended_roles", [])[:3]
            }
            return critical

        def extract_critical_agent5(data):
            critical = {
                "overall_authenticity_score": data.get("overall_authenticity_score"),
                "verdict_level": data.get("verdict_level"),
                "projects": data.get("projects", [])[:5],
                "cross_agent_conflicts": data.get("cross_agent_conflicts", [])[:3]
            }
            return critical

        # Get summarized versions of agent data
        agent1_clean = extract_critical_agent1(agent1_data)
        agent2_clean = extract_critical_agent2(agent2_data)
        agent3_clean = extract_critical_agent3(agent3_data)
        agent4_clean = extract_critical_agent4(agent4_data)
        agent5_clean = extract_critical_agent5(agent5_data)

        user_prompt = f"""Analyze the following candidate data across all pipeline agents and assess real technical depth per skill using coding platform evidence.

AGENT 1 OUTPUT (Profile with LeetCode/HackerRank data):
{json.dumps(agent1_clean)}

AGENT 2 OUTPUT (Evidence Verification Profile):
{json.dumps(agent2_clean)}

AGENT 3 OUTPUT (Hidden Skills Report):
{json.dumps(agent3_clean)}

AGENT 4 OUTPUT (Best Roles Report):
{json.dumps(agent4_clean)}

AGENT 5 OUTPUT (Authenticity Report):
{json.dumps(agent5_clean)}

Return ONLY this JSON: {json.dumps(output_schema)}

IMPORTANT RULES:
- Always prioritize LeetCode/HackerRank evidence over resume claims when determining evidenced_level
- If a skill has zero coding-platform evidence, evidenced_level must be "Unverified" even if resume claimed "Advanced" — set level_gap_detected = true and explain why
- HackerRank stars matter: 1 star = basic, 2-3 stars = intermediate, 4-5 stars = strong
- LeetCode difficulty ratio matters: mostly easy = fundamentals level even with high solve count
- Don't penalize candidates for not having coding-platform data on niche/tool skills (e.g. CrewAI, Streamlit) — these get evidenced_level based on project usage from Agent 5 instead
- recruiter_summary must be decisive and specific — tell the recruiter exactly what to test, not vague praise
- Strip markdown fences from Groq response before parsing"""

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

            response = session.post(
                self.api_url, headers=headers, json=payload, timeout=120
            )
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

            return sanitize_agent6_output(result_data, candidate_name)

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse API response: {str(e)}")
        except KeyError as e:
            raise Exception(f"Unexpected API response format: {str(e)}")


def sanitize_agent6_output(data: dict, candidate_name: str) -> dict:
    """
    Validates, sanitizes, and enforces data types, nesting levels, key names, and mandatory fields
    for Agent 6 (Technical Depth Assessment).
    """
    if not isinstance(data, dict):
        data = {}

    def to_int(val, default=0, min_val=0, max_val=99999):
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

    def to_bool(val, default=False):
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            return val.lower() in ("true", "yes", "1", "gap", "detected")
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

    overall_depth_score = to_int(data.get("overall_technical_depth_score"), default=70, max_val=100)

    # 1. Skills Assessed
    raw_skills = data.get("skills_assessed")
    sanitized_skills = []
    if isinstance(raw_skills, list):
        for sk in raw_skills:
            if not isinstance(sk, dict):
                continue
            s_name = to_str(sk.get("skill") or sk.get("name"), default="General Competency")
            claimed = to_str(sk.get("claimed_level"), default="Intermediate")
            evidenced = to_str(sk.get("evidenced_level"), default="Intermediate")
            readiness = to_str(sk.get("interview_readiness"), default="Ready")

            raw_pse = sk.get("problem_solving_evidence")
            if not isinstance(raw_pse, dict):
                raw_pse = {}

            pse = {
                "platform": to_str(raw_pse.get("platform"), default="LeetCode/GitHub"),
                "easy_solved": to_int(raw_pse.get("easy_solved"), default=0),
                "medium_solved": to_int(raw_pse.get("medium_solved"), default=0),
                "hard_solved": to_int(raw_pse.get("hard_solved"), default=0),
                "stars_or_rating": to_str(raw_pse.get("stars_or_rating"), default="N/A"),
                "evidence_strength": to_str(raw_pse.get("evidence_strength"), default="Moderate")
            }

            gap_detected = to_bool(sk.get("level_gap_detected"), default=False)
            gap_exp = to_str(sk.get("gap_explanation"), default="")
            interview_focus = to_str(sk.get("recommended_interview_focus"), default="Core concept evaluation")

            sanitized_skills.append({
                "skill": s_name,
                "claimed_level": claimed,
                "evidenced_level": evidenced,
                "interview_readiness": readiness,
                "problem_solving_evidence": pse,
                "level_gap_detected": gap_detected,
                "gap_explanation": gap_exp,
                "recommended_interview_focus": interview_focus
            })

    strongest = to_list_of_strs(data.get("strongest_technical_areas"))
    weakest = to_list_of_strs(data.get("weakest_technical_areas"))

    # 2. Problem Solving Summary
    raw_pss = data.get("problem_solving_summary")
    if not isinstance(raw_pss, dict):
        raw_pss = {}
    pss = {
        "total_problems_solved": to_int(raw_pss.get("total_problems_solved"), default=0),
        "difficulty_distribution": to_str(raw_pss.get("difficulty_distribution"), default="Balanced across easy and medium"),
        "consistency_rating": to_str(raw_pss.get("consistency_rating"), default="Consistent")
    }

    # 3. Interview Recommendation
    raw_ir = data.get("interview_recommendation")
    if not isinstance(raw_ir, dict):
        raw_ir = {}
    ir = {
        "suggested_round_type": to_str(raw_ir.get("suggested_round_type"), default="Technical System Design & Live Coding"),
        "topics_to_test": to_list_of_strs(raw_ir.get("topics_to_test")),
        "topics_to_avoid_assuming": to_list_of_strs(raw_ir.get("topics_to_avoid_assuming"))
    }

    rec_summary = to_str(data.get("recruiter_summary"))
    if not rec_summary:
        rec_summary = f"Technical depth assessment for {candidate_name} yields an overall score of {overall_depth_score}/100 across {len(sanitized_skills)} assessed skills."

    timestamp = to_str(data.get("timestamp")) or datetime.now().isoformat()

    return {
        "timestamp": timestamp,
        "candidate_name": candidate_name,
        "overall_technical_depth_score": overall_depth_score,
        "skills_assessed": sanitized_skills,
        "strongest_technical_areas": strongest,
        "weakest_technical_areas": weakest,
        "problem_solving_summary": pss,
        "interview_recommendation": ir,
        "recruiter_summary": rec_summary
    }


def run_technical_depth_assessment(
    agent1_file: Path,
    agent2_file: Path,
    agent3_file: Path,
    agent4_file: Path,
    agent5_file: Path,
    agent6_output_dir: Path,
    groq_api_key: str,
    candidate_name: str
) -> Path:
    agent6_output_dir.mkdir(exist_ok=True, parents=True)

    with open(agent1_file, "r", encoding="utf-8") as f:
        agent1_data = json.load(f)
    with open(agent2_file, "r", encoding="utf-8") as f:
        agent2_data = json.load(f)
    with open(agent3_file, "r", encoding="utf-8") as f:
        agent3_data = json.load(f)
    with open(agent4_file, "r", encoding="utf-8") as f:
        agent4_data = json.load(f)
    with open(agent5_file, "r", encoding="utf-8") as f:
        agent5_data = json.load(f)

    agent = TechnicalDepthAssessmentAgent(groq_api_key)
    report = agent.assess_technical_depth(
        agent1_data, agent2_data, agent3_data, agent4_data, agent5_data, candidate_name
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = agent6_output_dir / f"technical_depth_report_{candidate_name}_{timestamp}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return output_file


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Technical Depth Assessment Agent")
    parser.add_argument("--api-key", help="Groq API key", required=False)
    parser.add_argument("--agent1", help="Path to Agent 1 profile file", required=True)
    parser.add_argument("--agent2", help="Path to Agent 2 verification file", required=True)
    parser.add_argument("--agent3", help="Path to Agent 3 hidden skills file", required=True)
    parser.add_argument("--agent4", help="Path to Agent 4 best roles file", required=True)
    parser.add_argument("--agent5", help="Path to Agent 5 authenticity file", required=True)
    parser.add_argument("--name", help="Candidate name", required=True)
    parser.add_argument("--output-dir", default="e:/Resume Parser/Database/agent6_output", help="Output directory")

    args = parser.parse_args()
    api_key = args.api_key or os.getenv("VITE_GROQ_API_KEY")
    if not api_key:
        print("Error: Groq API key not provided")
        exit(1)

    output_path = run_technical_depth_assessment(
        Path(args.agent1),
        Path(args.agent2),
        Path(args.agent3),
        Path(args.agent4),
        Path(args.agent5),
        Path(args.output_dir),
        api_key,
        args.name
    )

    print(f"Technical depth report saved to: {output_path}")
