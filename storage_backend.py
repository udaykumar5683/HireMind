"""
Zero-dependency Supabase Storage backend for Resume Parser.
Replaces local filesystem writes so the Flask API works on ephemeral PaaS (Koyeb).
Falls back to local files if SUPABASE_URL/SUPABASE_KEY are not set (local dev).
"""

import os
import json
import io
from pathlib import Path
from typing import Optional, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent

STORAGE_BUCKET_NAME = "hiremind-data"

FOLDER_MAP = {
    "agent1": "agent1_output",
    "agent2": "agent2_output",
    "agent3": "agent3_output",
    "agent4": "agent4_output",
    "agent5": "agent5_output",
    "agent6": "agent6_output",
    "student": "student_profiles",
    "generated": "generated_profiles",
}


def _supabase_client():
    """Lazy-load the Supabase client only if env vars exist."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


def _local_folder_for(bucket_key: str) -> Path:
    if bucket_key.startswith("agent"):
        return BASE_DIR / "Database" / FOLDER_MAP.get(bucket_key, bucket_key)
    if bucket_key == "student":
        return BASE_DIR / "Student_Profile_Database"
    if bucket_key == "generated":
        return BASE_DIR / "Profile_generator" / "Profile_Database"
    return BASE_DIR / "_unknown_storage" / bucket_key


def save_json(bucket_key: str, filename: str, data: Any) -> str:
    """
    Save a JSON object either to Supabase Storage (production) or local disk (dev).
    Returns the accessible path/URL.
    """
    client = _supabase_client()

    if client is None:
        folder = _local_folder_for(bucket_key)
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(path)

    try:
        folder = FOLDER_MAP.get(bucket_key, bucket_key)
        storage_path = f"{folder}/{filename}"
        payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        try:
            client.storage.from_(STORAGE_BUCKET_NAME).upload(
                path=storage_path,
                file=io.BytesIO(payload),
                file_options={"content-type": "application/json", "x-upsert": "true"},
            )
        except Exception:
            try:
                client.storage.from_(STORAGE_BUCKET_NAME).update(
                    storage_path,
                    io.BytesIO(payload),
                    {"content-type": "application/json"},
                )
            except Exception:
                pass
        signed = client.storage.from_(STORAGE_BUCKET_NAME).create_signed_url(storage_path, 21600)
        return signed.get("signedURL", storage_path)
    except Exception as e:
        print(f"[storage_backend] Supabase save failed, falling back: {e}")
        return save_json_local_fallback(bucket_key, filename, data)


def save_json_local_fallback(bucket_key: str, filename: str, data: Any) -> str:
    """For PaaS: write to /tmp so we at least survive current request cycle."""
    folder = Path("/tmp") / FOLDER_MAP.get(bucket_key, bucket_key)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return str(path)


def read_json(path_or_url: str) -> Optional[Any]:
    """Read a JSON file from local path / signed URL / Supabase path."""
    if not path_or_url:
        return None

    if os.path.exists(path_or_url):
        with open(path_or_url, "r", encoding="utf-8") as f:
            return json.load(f)

    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        try:
            import requests
            r = requests.get(path_or_url, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"[storage_backend] URL read failed: {e}")
            return None

    client = _supabase_client()
    if client:
        try:
            res = client.storage.from_(STORAGE_BUCKET_NAME).download(path_or_url)
            return json.loads(res.decode("utf-8"))
        except Exception as e:
            print(f"[storage_backend] Supabase read failed: {e}")

    return None


def list_files(bucket_key: str, suffix: str = ".json") -> list[str]:
    """List filenames in a bucket/folder (Supabase Storage or local fallback)."""
    folder = FOLDER_MAP.get(bucket_key, bucket_key)
    client = _supabase_client()

    if client:
        try:
            files = client.storage.from_(STORAGE_BUCKET_NAME).list(folder)
            return [
                f"{folder}/{f['name']}"
                for f in files
                if f.get("name", "").endswith(suffix)
            ]
        except Exception as e:
            print(f"[storage_backend] Supabase list failed: {e}")

    local_dir = _local_folder_for(bucket_key)
    if not local_dir.exists():
        return []
    return [str(p) for p in sorted(local_dir.glob(f"*{suffix}"), reverse=True)]


def ensure_buckets_exist():
    """Idempotent: create the Supabase Storage bucket if missing (service_role only)."""
    client = _supabase_client()
    if not client:
        return
    try:
        existing = [b.name for b in client.storage.list_buckets()]
        if STORAGE_BUCKET_NAME not in existing:
            client.storage.create_bucket(STORAGE_BUCKET_NAME, public=False)
            print(f"[storage_backend] Created bucket: {STORAGE_BUCKET_NAME}")
    except Exception as e:
        print(f"[storage_backend] Bucket check skipped (normal for anon-only keys): {e}")


ensure_buckets_exist()
