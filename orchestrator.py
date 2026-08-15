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


def run_evidence_verifier(agent1_input_file: Path, agent2_output_dir: Path):
    """Run Evidence Correlation & Verification Agent"""
    agent2_output_dir.mkdir(exist_ok=True, parents=True)

    with open(agent1_input_file, "r", encoding="utf-8") as f:
        candidate_data = json.load(f)

    verifier = EvidenceVerifier(candidate_data)
    report = verifier.generate_full_report()

    output_file = agent2_output_dir / f"verification_{agent1_input_file.name}"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return output_file


def run_hidden_skill(agent1_input_file: Path, agent2_input_file: Path, agent3_output_dir: Path):
    """Run Hidden Skill Discovery Agent"""
    agent3_output_dir.mkdir(exist_ok=True, parents=True)

    with open(agent1_input_file, "r", encoding="utf-8") as f:
        candidate_data = json.load(f)

    with open(agent2_input_file, "r", encoding="utf-8") as f:
        verification_data = json.load(f)

    agent = HiddenSkillDiscoveryAgent(candidate_data, verification_data)
    report = agent.generate_full_report()

    output_file = agent3_output_dir / f"hidden_skill_profile_{agent1_input_file.name.replace('profile_', '')}"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return output_file


def run_best_role_finder(agent3_input_file: Path, agent4_output_dir: Path, groq_api_key: str):
    """Run Best Role Finder Agent"""
    agent4_output_dir.mkdir(exist_ok=True, parents=True)

    from datetime import datetime

    with open(agent3_input_file, "r", encoding="utf-8") as f:
        candidate_data = json.load(f)

    finder = BestRoleFinder(groq_api_key)

    filename_parts = agent3_input_file.stem.split("_")
    candidate_name_parts = []
    start_index = 3 if len(filename_parts) > 3 and filename_parts[2] == "profile" else 2
    for part in filename_parts[start_index:]:
        if len(part) == 8 and part.isdigit():
            break
        candidate_name_parts.append(part)
    candidate_name = "_".join(candidate_name_parts) if candidate_name_parts else "candidate"

    result = finder.find_best_roles(candidate_data, candidate_name)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = agent4_output_dir / f"best_roles_{candidate_name}_{timestamp}.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return output_file


def run_project_authenticity(
    agent1_file: Path,
    agent2_file: Path,
    agent3_file: Path,
    agent4_file: Path,
    agent5_output_dir: Path,
    groq_api_key: str,
    candidate_name: str
) -> Path:
    """Run Project Authenticity System (Agent 5)"""
    agent5_output_dir.mkdir(exist_ok=True, parents=True)

    # Load all agent data
    with open(agent1_file, "r", encoding="utf-8") as f:
        agent1_data = json.load(f)
    with open(agent2_file, "r", encoding="utf-8") as f:
        agent2_data = json.load(f)
    with open(agent3_file, "r", encoding="utf-8") as f:
        agent3_data = json.load(f)
    with open(agent4_file, "r", encoding="utf-8") as f:
        agent4_data = json.load(f)

    checker = ProjectAuthenticityChecker(groq_api_key)
    report = checker.check_authenticity(
        agent1_data,
        agent2_data,
        agent3_data,
        agent4_data,
        candidate_name
    )

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = agent5_output_dir / f"authenticity_report_{candidate_name}_{timestamp}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return output_file


def run_pipeline(profile_file_path: str, groq_api_key: str = None, progress_callback: Optional[Callable] = None):
    """Run the complete HireMind pipeline"""
    if not groq_api_key:
        groq_api_key = os.getenv("VITE_GROQ_API_KEY")

    db_dir = BASE_DIR / "Database"

    agent1_file = Path(profile_file_path)
    if not agent1_file.exists():
        raise FileNotFoundError(f"Profile file not found: {profile_file_path}")

    # Extract candidate name from filename
    filename_parts = agent1_file.stem.split("_")
    candidate_name_parts = []
    for part in filename_parts[1:]:
        if len(part) == 8 and part.isdigit():
            break
        candidate_name_parts.append(part)
    candidate_name = "_".join(candidate_name_parts) if candidate_name_parts else "candidate"

    results = {}

    # Step 2: Evidence Verifier
    if progress_callback:
        progress_callback(17, "Running Evidence Correlation & Verification Agent (Agent 2)...")
    agent2_output_dir = db_dir / "agent2_output"
    agent2_file = run_evidence_verifier(agent1_file, agent2_output_dir)
    results["agent2"] = {"file": str(agent2_file)}
    with open(agent2_file, "r", encoding="utf-8") as f:
        results["agent2"]["data"] = json.load(f)

    # Step 3: Hidden Skill Discovery
    if progress_callback:
        progress_callback(33, "Running Hidden Skill Discovery Agent (Agent 3)...")
    agent3_output_dir = db_dir / "agent3_output"
    agent3_file = run_hidden_skill(agent1_file, agent2_file, agent3_output_dir)
    results["agent3"] = {"file": str(agent3_file)}
    with open(agent3_file, "r", encoding="utf-8") as f:
        results["agent3"]["data"] = json.load(f)

    # Step 4: Best Role Finder
    if progress_callback:
        progress_callback(50, "Running Best Role Finder (Agent 4)...")
    agent4_output_dir = db_dir / "agent4_output"
    agent4_file = run_best_role_finder(agent3_file, agent4_output_dir, groq_api_key)
    results["agent4"] = {"file": str(agent4_file)}
    with open(agent4_file, "r", encoding="utf-8") as f:
        results["agent4"]["data"] = json.load(f)

    # Step 5: Project Authenticity
    if progress_callback:
        progress_callback(67, "Running Project Authenticity System (Agent 5)...")
    agent5_output_dir = db_dir / "agent5_output"
    agent5_file = run_project_authenticity(
        agent1_file,
        agent2_file,
        agent3_file,
        agent4_file,
        agent5_output_dir,
        groq_api_key,
        candidate_name
    )
    results["agent5"] = {"file": str(agent5_file)}
    with open(agent5_file, "r", encoding="utf-8") as f:
        results["agent5"]["data"] = json.load(f)

    # Step 6: Technical Depth Assessment
    if progress_callback:
        progress_callback(83, "Running Technical Depth Assessment (Agent 6)...")
    agent6_output_dir = db_dir / "agent6_output"
    agent6_file = run_technical_depth_assessment_impl(
        agent1_file,
        agent2_file,
        agent3_file,
        agent5_file,
        agent6_output_dir,
        groq_api_key,
        candidate_name
    )
    results["agent6"] = {"file": str(agent6_file)}
    with open(agent6_file, "r", encoding="utf-8") as f:
        results["agent6"]["data"] = json.load(f)

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
            print(f"  {agent}: {data['file']}")
    except Exception as e:
        print(f"❌ Pipeline failed: {e}")
        sys.exit(1)
