#!/usr/bin/env python3
"""
Master Orchestrator for HireMind Pipeline
Runs all agents in sequence:
1. Resume Parser (already creates agent1_output)
2. Evidence Correlation & Verification Agent (agent2_output)
3. Hidden Skill Discovery (agent3_output)
4. Best Role Finder (agent4_output)
"""

import sys
import os
from pathlib import Path
from typing import Callable, Optional
from datetime import datetime

# Add all agent directories to sys.path
BASE_DIR = Path(__file__).parent
AGENTS_DIR = {
    "evidence_verifier": BASE_DIR / "Evidence Correlation & Verification Agent",
    "hidden_skill": BASE_DIR / "Hidden Skill Discovery",
    "best_role": BASE_DIR / "Best Role Finder",
    "authenticity": BASE_DIR / "Project Authenticity System",
    "technical_depth": BASE_DIR / "Technical Depth Assessment"
}

for path in AGENTS_DIR.values():
    if str(path) not in sys.path:
        sys.path.append(str(path))

from evidence_verifier import EvidenceVerifier
from hidden_skill_discovery import HiddenSkillDiscoveryAgent
from best_role_finder import BestRoleFinder
from authenticity_checker import ProjectAuthenticityChecker
from technical_depth_assessment import (
    run_technical_depth_assessment as run_technical_depth_assessment_impl
)

import json
from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")


def run_evidence_verifier(agent1_data: dict) -> dict:
    """Run Evidence Correlation & Verification Agent (Agent 2) in memory"""
    verifier = EvidenceVerifier(agent1_data)
    report = verifier.generate_full_report()
    return report


def run_hidden_skill(agent1_data: dict, agent2_data: dict) -> dict:
    """Run Hidden Skill Discovery Agent (Agent 3) in memory"""
    agent = HiddenSkillDiscoveryAgent(agent1_data, agent2_data)
    report = agent.generate_full_report()
    return report


def run_best_role_finder(agent3_data: dict, groq_api_key: str, candidate_name: str) -> dict:
    """Run Best Role Finder Agent (Agent 4) in memory"""
    finder = BestRoleFinder(groq_api_key)
    result = finder.find_best_roles(agent3_data, candidate_name)
    return result


def run_project_authenticity(
    agent1_data: dict,
    agent2_data: dict,
    agent3_data: dict,
    agent4_data: dict,
    groq_api_key: str,
    candidate_name: str
) -> dict:
    """Run Project Authenticity System (Agent 5) in memory"""
    checker = ProjectAuthenticityChecker(groq_api_key)
    report = checker.check_authenticity(
        agent1_data,
        agent2_data,
        agent3_data,
        agent4_data,
        candidate_name
    )
    return report


def run_technical_depth_assessment(
    agent1_data: dict,
    agent2_data: dict,
    agent3_data: dict,
    agent4_data: dict,
    agent5_data: dict,
    groq_api_key: str,
    candidate_name: str
) -> dict:
    """Run Technical Depth Assessment System (Agent 6) in memory"""
    return run_technical_depth_assessment_impl(
        agent1_data,
        agent2_data,
        agent3_data,
        agent4_data,
        agent5_data,
        groq_api_key,
        candidate_name
    )


def run_pipeline(profile_input: any, groq_api_key: str = None, progress_callback: Optional[Callable] = None):
    """Run the complete HireMind pipeline using in-memory data hand-off."""
    if not groq_api_key:
        groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("VITE_GROQ_API_KEY")

    db_dir = BASE_DIR / "Database"

    # Step 1: Process Agent 1 Data
    print("[Pipeline] Agent 1 started")
    file_stem = ""
    if isinstance(profile_input, dict):
        agent1_data = profile_input
    elif isinstance(profile_input, (str, Path)):
        agent1_file = Path(profile_input)
        if not agent1_file.exists():
            raise FileNotFoundError(f"Profile file not found: {profile_input}")
        with open(agent1_file, "r", encoding="utf-8") as f:
            agent1_data = json.load(f)
        file_stem = agent1_file.stem
    else:
        raise ValueError("Profile input must be a dictionary or a valid file path string/Path.")

    # Extract candidate name from agent1_data or filename
    candidate_name = agent1_data.get("profile", {}).get("name")
    if not candidate_name or candidate_name.lower() in ["unknown candidate", "unknown"]:
        if file_stem and "_" in file_stem:
            filename_parts = file_stem.split("_")
            candidate_name_parts = []
            for part in filename_parts[1:]:
                if len(part) == 8 and part.isdigit():
                    break
                candidate_name_parts.append(part)
            candidate_name = "_".join(candidate_name_parts) if candidate_name_parts else "candidate"
        else:
            candidate_name = "candidate"
    
    print("[Pipeline] Agent 1 completed")

    results = {}

    # Step 2: Evidence Verifier (Agent 2)
    print("[Pipeline] Agent 2 started")
    if progress_callback:
        progress_callback(17, "Running Evidence Correlation & Verification Agent (Agent 2)...")
    try:
        agent2_data = run_evidence_verifier(agent1_data)
    except Exception as e:
        raise Exception(f"Agent 2 failed: {str(e)}") from e

    results["agent2"] = {"data": agent2_data}
    try:
        agent2_output_dir = db_dir / "agent2_output"
        agent2_output_dir.mkdir(exist_ok=True, parents=True)
        agent2_file = agent2_output_dir / f"verification_{candidate_name}.json"
        with open(agent2_file, "w", encoding="utf-8") as f:
            json.dump(agent2_data, f, indent=2, ensure_ascii=False)
        results["agent2"]["file"] = str(agent2_file)
    except Exception as save_err:
        print(f"[Pipeline] Optional Agent 2 output save failed: {save_err}")
    print("[Pipeline] Agent 2 completed")

    # Step 3: Hidden Skill Discovery (Agent 3)
    print("[Pipeline] Agent 3 started")
    if progress_callback:
        progress_callback(33, "Running Hidden Skill Discovery Agent (Agent 3)...")
    try:
        agent3_data = run_hidden_skill(agent1_data, agent2_data)
    except Exception as e:
        raise Exception(f"Agent 3 failed: {str(e)}") from e

    results["agent3"] = {"data": agent3_data}
    try:
        agent3_output_dir = db_dir / "agent3_output"
        agent3_output_dir.mkdir(exist_ok=True, parents=True)
        agent3_file = agent3_output_dir / f"hidden_skill_{candidate_name}.json"
        with open(agent3_file, "w", encoding="utf-8") as f:
            json.dump(agent3_data, f, indent=2, ensure_ascii=False)
        results["agent3"]["file"] = str(agent3_file)
    except Exception as save_err:
        print(f"[Pipeline] Optional Agent 3 output save failed: {save_err}")
    print("[Pipeline] Agent 3 completed")

    # Step 4: Best Role Finder (Agent 4)
    print("[Pipeline] Agent 4 started")
    if progress_callback:
        progress_callback(50, "Running Best Role Finder (Agent 4)...")
    try:
        agent4_data = run_best_role_finder(agent3_data, groq_api_key, candidate_name)
    except Exception as e:
        raise Exception(f"Agent 4 failed: {str(e)}") from e

    results["agent4"] = {"data": agent4_data}
    try:
        agent4_output_dir = db_dir / "agent4_output"
        agent4_output_dir.mkdir(exist_ok=True, parents=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        agent4_file = agent4_output_dir / f"best_roles_{candidate_name}_{timestamp}.json"
        with open(agent4_file, "w", encoding="utf-8") as f:
            json.dump(agent4_data, f, indent=2, ensure_ascii=False)
        results["agent4"]["file"] = str(agent4_file)
    except Exception as save_err:
        print(f"[Pipeline] Optional Agent 4 output save failed: {save_err}")
    print("[Pipeline] Agent 4 completed")

    # Step 5: Project Authenticity (Agent 5)
    print("[Pipeline] Agent 5 started")
    if progress_callback:
        progress_callback(67, "Running Project Authenticity System (Agent 5)...")
    try:
        agent5_data = run_project_authenticity(
            agent1_data,
            agent2_data,
            agent3_data,
            agent4_data,
            groq_api_key,
            candidate_name
        )
    except Exception as e:
        raise Exception(f"Agent 5 failed: {str(e)}") from e

    results["agent5"] = {"data": agent5_data}
    try:
        agent5_output_dir = db_dir / "agent5_output"
        agent5_output_dir.mkdir(exist_ok=True, parents=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        agent5_file = agent5_output_dir / f"authenticity_report_{candidate_name}_{timestamp}.json"
        with open(agent5_file, "w", encoding="utf-8") as f:
            json.dump(agent5_data, f, indent=2, ensure_ascii=False)
        results["agent5"]["file"] = str(agent5_file)
    except Exception as save_err:
        print(f"[Pipeline] Optional Agent 5 output save failed: {save_err}")
    print("[Pipeline] Agent 5 completed")

    # Step 6: Technical Depth Assessment (Agent 6)
    print("[Pipeline] Agent 6 started")
    if progress_callback:
        progress_callback(83, "Running Technical Depth Assessment (Agent 6)...")
    try:
        agent6_data = run_technical_depth_assessment(
            agent1_data,
            agent2_data,
            agent3_data,
            agent4_data,
            agent5_data,
            groq_api_key,
            candidate_name
        )
    except Exception as e:
        raise Exception(f"Agent 6 failed: {str(e)}") from e

    results["agent6"] = {"data": agent6_data}
    try:
        agent6_output_dir = db_dir / "agent6_output"
        agent6_output_dir.mkdir(exist_ok=True, parents=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        agent6_file = agent6_output_dir / f"technical_depth_report_{candidate_name}_{timestamp}.json"
        with open(agent6_file, "w", encoding="utf-8") as f:
            json.dump(agent6_data, f, indent=2, ensure_ascii=False)
        results["agent6"]["file"] = str(agent6_file)
    except Exception as save_err:
        print(f"[Pipeline] Optional Agent 6 output save failed: {save_err}")
    print("[Pipeline] Agent 6 completed")

    if progress_callback:
        progress_callback(100, "Pipeline completed successfully!")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="HireMind Master Orchestrator")
    parser.add_argument("profile_file", help="Path to profile JSON file from Agent1")
    parser.add_argument("--groq-api-key", help="Groq API key (from .env if not provided)")

    args = parser.parse_args()

    try:
        results = run_pipeline(args.profile_file, args.groq_api_key)
        print("✅ Pipeline completed successfully!")
        for agent, data in results.items():
            print(f"  {agent}: {data.get('file', 'In-memory object')}")
    except Exception as e:
        print(f"❌ Pipeline failed: {e}")
        sys.exit(1)
