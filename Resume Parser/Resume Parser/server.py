
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import subprocess
from datetime import datetime
from dotenv import load_dotenv
from url_extractor import extract_url
import threading

# Load environment variables from .env file
load_dotenv()

# Add orchestrator to path
import sys
from pathlib import Path
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.append(str(BASE_DIR))
from orchestrator import run_pipeline

app = Flask(__name__)
CORS(app, resources={
    r"/extract-url": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:3000", "http://127.0.0.1:3000"]},
    r"/save-profile": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:3000", "http://127.0.0.1:3000"]},
    r"/run-pipeline": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:3000", "http://127.0.0.1:3000"]},
    r"/pipeline-status": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:3000", "http://127.0.0.1:3000"]}
})

# Get environment variables
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
PROXYCURL_KEY = os.getenv("PROXYCURL_KEY", "")
GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY", "")

# Store directory
STORE_DIR = os.path.join(BASE_DIR, "Database", "agent1_output")
os.makedirs(STORE_DIR, exist_ok=True)

# Student Profile Database directory
STUDENT_DB_DIR = os.path.join(BASE_DIR, "Student_Profile_Database")
os.makedirs(STUDENT_DB_DIR, exist_ok=True)

# Profile generator
PROFILE_GENERATOR_DIR = os.path.join(BASE_DIR, "Profile_generator")
PROFILE_GENERATOR_SCRIPT = os.path.join(PROFILE_GENERATOR_DIR, "profile_generator.py")
PROFILE_DB_DIR = os.path.join(PROFILE_GENERATOR_DIR, "Profile_Database")
os.makedirs(PROFILE_DB_DIR, exist_ok=True)

# Pipeline state tracking
pipeline_state = {
    "status": "idle",  # idle, running, completed, failed
    "progress": 0,
    "current_step": "",
    "results": None,
    "error": None,
    "student_profile_filepath": None
}


@app.route("/extract-url", methods=["POST"])
def extract_url_endpoint():
    data = request.get_json()
    url = data.get("url")
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    try:
        result = extract_url(url, github_token=GITHUB_TOKEN, proxycurl_key=PROXYCURL_KEY)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/save-profile", methods=["POST"])
def save_profile_endpoint():
    data = request.get_json()
    profile = data.get("profile")
    processed_urls = data.get("processed_urls")
    
    if not profile:
        return jsonify({"error": "Profile data is required"}), 400
    
    try:
        # Generate filename using timestamp and name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name_slug = profile.get("name", "unknown").lower().replace(" ", "_").replace(".", "")
        filename = f"profile_{name_slug}_{timestamp}.json"
        filepath = os.path.join(STORE_DIR, filename)
        
        # Combine all data
        full_data = {
            "timestamp": datetime.now().isoformat(),
            "profile": profile,
            "processed_urls": processed_urls or []
        }
        
        # Save as JSON
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(full_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({"success": True, "filename": filename, "filepath": filepath}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/run-pipeline", methods=["POST"])
def run_pipeline_endpoint():
    global pipeline_state

    if pipeline_state["status"] == "running":
        return jsonify({"error": "Pipeline is already running"}), 400

    data = request.get_json()
    filepath = data.get("filepath")

    if not filepath:
        return jsonify({"error": "Filepath is required"}), 400

    if not os.path.exists(filepath):
        return jsonify({"error": "Profile file not found"}), 400

    def pipeline_thread():
        global pipeline_state
        try:
            pipeline_state = {
                "status": "running",
                "progress": 0,
                "current_step": "Initializing pipeline...",
                "results": None,
                "error": None,
                "student_profile_filepath": None
            }

            # Load original profile data
            with open(filepath, "r", encoding="utf-8") as f:
                original_data = json.load(f)
            profile = original_data.get("profile", {})
            processed_urls = original_data.get("processed_urls", [])

            # Define progress callback
            def update_progress(progress, step):
                global pipeline_state
                pipeline_state["progress"] = progress
                pipeline_state["current_step"] = step

            # Run full pipeline with progress updates
            results = run_pipeline(filepath, GROQ_API_KEY, progress_callback=update_progress)

            # Combine all data into unified student profile
            unified_profile = {
                "timestamp": datetime.now().isoformat(),
                "profile": profile,
                "processed_urls": processed_urls,
                "pipeline_results": results
            }

            # Generate filename from user's name
            name_slug = profile.get("name", "unknown").lower().replace(" ", "_").replace(".", "")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            student_filename = f"{name_slug}_{timestamp}.json"
            student_filepath = os.path.join(STUDENT_DB_DIR, student_filename)

            # Save unified profile to JSON
            with open(student_filepath, "w", encoding="utf-8") as f:
                json.dump(unified_profile, f, ensure_ascii=False, indent=2)

            # Generate recruiter-facing profile
            generated_profile_filepath = None
            if os.path.exists(PROFILE_GENERATOR_SCRIPT):
                try:
                    result = subprocess.run(
                        ["python", PROFILE_GENERATOR_SCRIPT, student_filepath],
                        capture_output=True,
                        text=True
                    )
                    print("Profile generator output:", result.stdout)
                    if result.stderr:
                        print("Profile generator error:", result.stderr)
                    # Get generated filepath (hacky but works: parse from script print)
                    import re
                    match = re.search(r"Generated and saved profile: (.*)", result.stdout)
                    if match:
                        generated_profile_filepath = match.group(1).strip()
                except Exception as e:
                    print(f"Error running profile generator: {e}")

            pipeline_state["status"] = "completed"
            pipeline_state["results"] = results
            pipeline_state["student_profile_filepath"] = student_filepath
            pipeline_state["generated_profile_filepath"] = generated_profile_filepath
        except Exception as e:
            pipeline_state["status"] = "failed"
            pipeline_state["error"] = str(e)

    threading.Thread(target=pipeline_thread, daemon=True).start()
    return jsonify({"success": True, "message": "Pipeline started"}), 200


@app.route("/pipeline-status", methods=["GET"])
def get_pipeline_status():
    return jsonify(pipeline_state), 200


if __name__ == "__main__":
    app.run(port=5000, debug=True)
