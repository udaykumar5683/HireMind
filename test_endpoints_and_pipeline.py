import sys
import os
import json
import time
from pathlib import Path

# Add orchestrator directory to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Add server directory to path
SERVER_DIR = BASE_DIR / "Resume Parser" / "Resume Parser"
sys.path.insert(0, str(SERVER_DIR))

from server import app, pipeline_state
from orchestrator import (
    run_evidence_verifier,
    run_hidden_skill,
    run_best_role_finder,
    run_project_authenticity,
    run_technical_depth_assessment,
    run_pipeline
)

def test_direct_in_memory_pipeline():
    print("\n=== Testing Direct In-Memory Agent Pipeline Hand-off (Agents 1-6) ===")
    sample_agent1_data = {
        "timestamp": "2026-09-23T12:00:00",
        "profile": {
            "name": "InMemory Test Candidate",
            "email": "inmemory.test@example.com",
            "summary": "Experienced Python and Cloud developer.",
            "skills": {
                "technical": ["Python", "Flask", "PostgreSQL", "Docker", "REST API"]
            },
            "projects": [
                {
                    "name": "HireMind Platform",
                    "description": "Multi-agent AI platform built with Python, Flask, and React.",
                    "technologies": ["Python", "Flask", "React", "Docker"]
                }
            ],
            "certifications": ["AWS Certified Developer"]
        },
        "processed_urls": [
            {
                "name": "github_profile",
                "type": "github",
                "data": {
                    "source": "github",
                    "all_languages": ["Python", "JavaScript", "Dockerfile"],
                    "top_repos": [
                        {
                            "name": "hiremind-platform",
                            "language": "Python",
                            "description": "Multi-agent recruitment system using Flask and Groq AI.",
                            "topics": ["python", "flask", "ai"]
                        }
                    ]
                }
            }
        ]
    }

    # Step 1 -> Step 2
    print("Executing Agent 2 in memory...")
    agent2_data = run_evidence_verifier(sample_agent1_data)
    assert isinstance(agent2_data, dict), "Agent 2 output must be a dict"
    assert "verified_skills" in agent2_data, "Agent 2 output missing verified_skills"
    print("Agent 2 verified skills:", len(agent2_data.get("verified_skills", [])))

    # Step 1 + Step 2 -> Step 3
    print("Executing Agent 3 in memory...")
    agent3_data = run_hidden_skill(sample_agent1_data, agent2_data)
    assert isinstance(agent3_data, dict), "Agent 3 output must be a dict"
    assert "hidden_skills" in agent3_data, "Agent 3 output missing hidden_skills"
    print("Agent 3 hidden skills detected:", len(agent3_data.get("hidden_skills", [])))

    # Step 3 -> Step 4
    groq_key = os.getenv("GROQ_API_KEY") or os.getenv("VITE_GROQ_API_KEY") or "mock_key"
    print("Executing Agent 4 in memory...")
    agent4_data = run_best_role_finder(agent3_data, groq_key, "InMemory Test Candidate")
    assert isinstance(agent4_data, dict), "Agent 4 output must be a dict"

    # Step 1 + 2 + 3 + 4 -> Step 5
    print("Executing Agent 5 in memory...")
    agent5_data = run_project_authenticity(
        sample_agent1_data,
        agent2_data,
        agent3_data,
        agent4_data,
        groq_key,
        "InMemory Test Candidate"
    )
    assert isinstance(agent5_data, dict), "Agent 5 output must be a dict"

    # Step 1 + 2 + 3 + 4 + 5 -> Step 6
    print("Executing Agent 6 in memory...")
    agent6_data = run_technical_depth_assessment(
        sample_agent1_data,
        agent2_data,
        agent3_data,
        agent4_data,
        agent5_data,
        groq_key,
        "InMemory Test Candidate"
    )
    assert isinstance(agent6_data, dict), "Agent 6 output must be a dict"
    print("[OK] Direct in-memory agent-to-agent pipeline execution verified successfully!")

def run_tests():
    test_direct_in_memory_pipeline()

    client = app.test_client()
    print("\n=== Testing Removed Endpoints (Must return 404) ===")
    removed_endpoints = ["/student-profiles", "/generated-profiles", "/read-profile"]
    for ep in removed_endpoints:
        res = client.get(ep)
        print(f"GET {ep} -> Status: {res.status_code}")
        assert res.status_code == 404, f"Expected 404 for {ep}, got {res.status_code}"

    print("\n=== Testing Retained Health & Info Endpoints (Must return 200) ===")
    res = client.get("/")
    print(f"GET / -> Status: {res.status_code}, Body: {res.get_json()}")
    assert res.status_code == 200

    res = client.get("/health")
    print(f"GET /health -> Status: {res.status_code}, Body: {res.get_json()}")
    assert res.status_code == 200

    print("\n=== Testing Profile Save Endpoint (/save-profile) ===")
    sample_profile = {
        "profile": {
            "name": "Audit Test Candidate",
            "email": "audit.test@example.com",
            "skills": {"technical": ["Python", "Flask", "React", "Docker"]}
        },
        "processed_urls": []
    }
    res = client.post("/save-profile", json=sample_profile)
    print(f"POST /save-profile -> Status: {res.status_code}, Body: {res.get_json()}")
    assert res.status_code == 200
    save_data = res.get_json()
    assert save_data.get("success") is True
    agent1_data = save_data.get("agent1_data")
    assert agent1_data and isinstance(agent1_data, dict)
    print("save-profile successfully returned agent1_data dictionary")

    print("\n=== Testing Pipeline Run Endpoint (/run-pipeline) with In-Memory Payload ===")
    res = client.post("/run-pipeline", json={"agent1_data": agent1_data})
    print(f"POST /run-pipeline (in-memory) -> Status: {res.status_code}, Body: {res.get_json()}")
    assert res.status_code == 200
    assert res.get_json().get("success") is True

    print("\n=== Testing Pipeline Status Endpoint (/pipeline-status) ===")
    res = client.get("/pipeline-status")
    print(f"GET /pipeline-status -> Status: {res.status_code}, Body: {res.get_json()}")
    assert res.status_code == 200
    status_data = res.get_json()
    assert status_data.get("status") in ["running", "completed", "failed"]

    # Poll status for up to 15 seconds to verify thread progress
    for _ in range(15):
        time.sleep(1)
        res = client.get("/pipeline-status")
        st = res.get_json()
        print(f"Polling status: {st.get('status')} | progress: {st.get('progress')}% | step: {st.get('current_step')}")
        if st.get("status") in ["completed", "failed"]:
            break

    print("\n[OK] ALL ENDPOINT AND PIPELINE REGRESSION TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
