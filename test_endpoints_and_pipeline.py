import sys
import os
import json
import time
from pathlib import Path

# Add server directory to path
SERVER_DIR = Path(__file__).resolve().parent / "Resume Parser" / "Resume Parser"
sys.path.insert(0, str(SERVER_DIR))

# Import Flask app
from server import app, pipeline_state

def run_tests():
    client = app.test_client()
    print("=== Testing Removed Endpoints (Must return 404) ===")
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
    filepath = save_data.get("filepath")
    assert filepath and os.path.exists(filepath)
    print(f"Saved file verified at: {filepath}")

    print("\n=== Testing Pipeline Run Endpoint (/run-pipeline) ===")
    res = client.post("/run-pipeline", json={"filepath": filepath})
    print(f"POST /run-pipeline -> Status: {res.status_code}, Body: {res.get_json()}")
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
