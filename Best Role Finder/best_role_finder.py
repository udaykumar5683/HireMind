#!/usr/bin/env python3
"""
Best Role Finder Agent (Agent 4) for HireMind Platform

This agent reads hidden skill reports from Agent 3 and uses LLM to determine
the best job roles for candidates.
"""

import json
import os
from typing import Dict, List, Any
from pathlib import Path
from datetime import datetime
import requests

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")


class BestRoleFinder:
    def __init__(self, groq_api_key: str):
        self.api_key = groq_api_key
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    def find_best_roles(self, candidate_data: Dict[str, Any], candidate_name: str) -> Dict[str, Any]:
        """
        Find best roles for a candidate using LLM
        """
        system_prompt = """You are Agent 4 of HireMind, the final step in a multi-agent recruitment pipeline. You receive a deep candidate analysis and decide the best job roles for them. Be decisive, evidence-based, and inspiring — your output helps HRs act fast and confidently. Return only valid JSON, no markdown fences."""

        output_schema = {
            "timestamp": "ISO 8601 timestamp string",
            "candidate_name": "string",
            "overall_strength_score": 0,
            "top_recommended_roles": [
                {
                    "rank": 1,
                    "role_title": "",
                    "match_score": 0,
                    "why_this_role": "",
                    "supporting_evidence": [],
                    "growth_path": ""
                }
            ],
            "domain_best_fit": "",
            "candidate_archetype": "",
            "career_stage": "",
            "one_line_pitch": "",
            "recruiter_action": ""
        }

        user_prompt = f"""Based on this candidate analysis from our AI pipeline, recommend the top 3 best-fit job roles.

CANDIDATE ANALYSIS:
{json.dumps(candidate_data, indent=2)}

Return ONLY this JSON structure (exact format):
{json.dumps(output_schema, indent=2)}

IMPORTANT: Return ONLY valid JSON, no extra text, no markdown."""

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
            from requests.adapters import HTTPAdapter
            from urllib3.util.retry import Retry

            # Create a session with retries
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
            
            # Clean up any markdown fences
            content = content.replace("```json", "").replace("```", "").strip()
            
            # Parse JSON
            result_data = json.loads(content)
            
            # Force override timestamp, candidate name, and strength score to ensure correctness
            result_data["timestamp"] = datetime.now().isoformat()
            result_data["candidate_name"] = candidate_name
            result_data["overall_strength_score"] = candidate_data.get("candidate_strength_score", 50)
            
            # Ensure recruiter_action is one of the expected values
            valid_actions = ["Fast-track for interview", "Add to talent pool", "Revisit in 6 months"]
            if result_data.get("recruiter_action") not in valid_actions:
                # Determine based on overall strength score
                if result_data["overall_strength_score"] >= 70:
                    result_data["recruiter_action"] = "Fast-track for interview"
                elif result_data["overall_strength_score"] >= 40:
                    result_data["recruiter_action"] = "Add to talent pool"
                else:
                    result_data["recruiter_action"] = "Revisit in 6 months"
            
            return result_data
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse API response: {str(e)}")
        except KeyError as e:
            raise Exception(f"Unexpected API response format: {str(e)}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Best Role Finder Agent (Agent 4)")
    parser.add_argument("--api-key", help="Groq API key (defaults to VITE_GROQ_API_KEY from .env)")
    parser.add_argument("--input-dir", default="e:/Resume Parser/Database/agent3_output", 
                        help="Directory containing hidden skill reports")
    parser.add_argument("--output-dir", default="e:/Resume Parser/Database/agent4_output",
                        help="Directory to save best role reports")
    
    args = parser.parse_args()
    
    # Get API key from args or environment
    api_key = args.api_key or os.getenv("VITE_GROQ_API_KEY")
    if not api_key:
        print("Error: Groq API key not provided. Use --api-key or set VITE_GROQ_API_KEY in .env")
        return
    
    input_path = Path(args.input_dir)
    output_path = Path(args.output_dir)
    output_path.mkdir(exist_ok=True, parents=True)
    
    if not input_path.exists():
        print(f"Input directory not found: {input_path}")
        return
    
    finder = BestRoleFinder(api_key)
    
    # Process all hidden skill reports
    for report_file in input_path.glob("hidden_skill_*.json"):
        print(f"\nProcessing: {report_file.name}")
        
        try:
            # Extract candidate name from filename
            # Handle both formats: hidden_skill_report_uday_20260620_150021.json and hidden_skill_profile_usha_20260627_214425.json
            filename_parts = report_file.stem.split("_")
            # Find where timestamp starts (looking for 8-digit date)
            candidate_name_parts = []
            # Find the index after "report" or "profile"
            start_index = 3 if len(filename_parts) > 3 and filename_parts[2] == "report" else (3 if len(filename_parts) > 3 and filename_parts[2] == "profile" else 2)
            for part in filename_parts[start_index:]:
                if len(part) == 8 and part.isdigit():
                    break
                candidate_name_parts.append(part)
            candidate_name = "_".join(candidate_name_parts) if candidate_name_parts else "candidate"
            
            with open(report_file, "r", encoding="utf-8") as f:
                candidate_data = json.load(f)
            
            print(f"  Finding best roles for: {candidate_name}")
            result = finder.find_best_roles(candidate_data, candidate_name)
            
            # Save result
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = output_path / f"best_roles_{candidate_name}_{timestamp}.json"
            
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"  Report saved to: {output_file}")
            
        except Exception as e:
            print(f"  Error processing {report_file.name}: {str(e)}")


if __name__ == "__main__":
    main()