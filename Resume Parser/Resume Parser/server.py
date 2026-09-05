
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import subprocess
import requests
from datetime import datetime
from dotenv import load_dotenv
from url_extractor import extract_url
import threading

# Add workspace root to path so imports work regardless of the current working directory.
import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

# Load environment variables from workspace root and local dir
load_dotenv(BASE_DIR / ".env")
load_dotenv(Path(__file__).parent / ".env")
load_dotenv()

from orchestrator import run_pipeline

# ── Storage backend (Supabase Storage for PaaS, local files for dev) ──
sys.path.insert(0, str(BASE_DIR))
from storage_backend import save_json, read_json, list_files, STORAGE_BUCKET_NAME

app = Flask(__name__)
app.url_map.strict_slashes = False
# Comma-separated browser origins. Set CORS_ORIGINS for the deployed URLs.
CORS(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000").split(","), supports_credentials=True)

# Helper functions for env vars
def get_groq_api_key():
    return os.getenv("GROQ_API_KEY", os.getenv("VITE_GROQ_API_KEY", ""))

def get_github_token():
    return os.getenv("GITHUB_TOKEN", "")

def get_proxycurl_key():
    return os.getenv("PROXYCURL_KEY", "")


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ok", "message": "Resume Parser API is running"}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/parse-resume", methods=["POST", "OPTIONS"])
def parse_resume():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    groq_key = get_groq_api_key()
    if not groq_key:
        return jsonify({"error": "GROQ_API_KEY is not configured in .env file"}), 503

    data = request.get_json() or {}
    payload = data.get("payload")
    if not isinstance(payload, dict):
        return jsonify({"error": "A Groq request payload is required"}), 400

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {groq_key}"},
            json=payload,
            timeout=60,
        )
        return jsonify(response.json()), response.status_code
    except requests.RequestException as error:
        return jsonify({"error": str(error)}), 502


@app.route("/github/<path:github_path>", methods=["GET"])
def github_proxy(github_path):
    """Proxy GitHub API calls so GITHUB_TOKEN is never sent to the browser."""
    token = get_github_token()
    try:
        response = requests.get(
            f"https://api.github.com/{github_path}",
            headers={"Authorization": f"Bearer {token}"} if token else {},
            params=request.args,
            timeout=30,
        )
        return jsonify(response.json()), response.status_code
    except requests.RequestException as error:
        return jsonify({"error": str(error)}), 502

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
        result = extract_url(url, github_token=get_github_token(), proxycurl_key=get_proxycurl_key())
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

        # Combine all data
        full_data = {
            "timestamp": datetime.now().isoformat(),
            "profile": profile,
            "processed_urls": processed_urls or []
        }

        # Save via storage backend (Supabase Storage in prod, local in dev)
        remote_path = save_json("agent1", filename, full_data)

        # Also save to local disk for the orchestrator pipeline (which reads Path objects)
        os.makedirs(STORE_DIR, exist_ok=True)
        local_path = os.path.join(STORE_DIR, filename)
        if not os.path.exists(local_path):
            with open(local_path, "w", encoding="utf-8") as f:
                json.dump(full_data, f, ensure_ascii=False, indent=2)

        return jsonify({"success": True, "filename": filename, "filepath": local_path, "remote": remote_path}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/student-profiles", methods=["GET"])
def list_student_profiles():
    """Portal-facing: list all generated student profiles sorted newest first."""
    files = list_files("student")
    return jsonify({"count": len(files), "files": files}), 200


@app.route("/generated-profiles", methods=["GET"])
def list_generated_profiles():
    """Portal-facing: list all recruiter-facing generated profiles."""
    files = list_files("generated")
    lookup = request.args.get("lookup")
    if lookup:
        filtered = [f for f in files if (lookup in f) or (lookup in os.path.basename(f))]
        return jsonify({"count": len(filtered), "files": filtered}), 200
    return jsonify({"count": len(files), "files": files}), 200


@app.route("/read-profile", methods=["GET"])
def read_profile_endpoint():
    """Portal-facing: fetch a single profile JSON by storage path, signed URL, or local path."""
    path_or_url = request.args.get("path") or request.args.get("file") or request.args.get("url")
    if not path_or_url:
        return jsonify({"error": "Missing ?path= parameter"}), 400
    try:
        data = read_json(path_or_url)
        if data is None:
            return jsonify({"error": "Profile not found or unreadable"}), 404
        return jsonify(data), 200
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
            results = run_pipeline(filepath, get_groq_api_key(), progress_callback=update_progress)

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
            # Also persist to Supabase Storage for survival across PaaS restarts
            try:
                save_json("student", student_filename, unified_profile)
            except Exception as storage_err:
                print(f"[pipeline] Supabase student save warning (non-fatal): {storage_err}")

            # Generate recruiter-facing profile via Agent 8 (Profile Generator)
            generated_profile_filepath = None
            try:
                profile_gen_dir = BASE_DIR / "Profile_generator"
                if str(profile_gen_dir) not in sys.path:
                    sys.path.append(str(profile_gen_dir))
                from profile_generator import generate_profile
                generated_profile_filepath = generate_profile(student_filepath)
                print("Agent 8 Profile generator succeeded:", generated_profile_filepath)
            except Exception as e:
                print(f"Error running profile generator in-process: {e}")

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
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
