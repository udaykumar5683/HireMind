
import json
import os
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STUDENT_DB_DIR = os.path.join(os.path.dirname(BASE_DIR), "Student_Profile_Database")
PROFILE_DB_DIR = os.path.join(BASE_DIR, "Profile_Database")

os.makedirs(PROFILE_DB_DIR, exist_ok=True)


def generate_profile(unified_profile_path: str):
    # Load unified profile
    with open(unified_profile_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    profile = data["profile"]
    pipeline_results = data.get("pipeline_results", {})
    agent2 = pipeline_results.get("agent2", {}).get("data", {})
    agent3 = pipeline_results.get("agent3", {}).get("data", {})
    agent4 = pipeline_results.get("agent4", {}).get("data", {})
    agent5 = pipeline_results.get("agent5", {}).get("data", {})
    agent6 = pipeline_results.get("agent6", {}).get("data", {})

    # Build header
    full_name = profile.get("name", "Unknown Candidate")
    target_role = agent4.get("domain_best_fit", "General Role")
    one_line_pitch = agent4.get("one_line_pitch", "Candidate seeking opportunity")
    contact = {
        "email": profile.get("email", ""),
        "phone": profile.get("phone", ""),
        "location": profile.get("location", "")
    }
    links = profile.get("links", {})

    # Build scorecard
    overall_strength = agent4.get("overall_strength_score", agent3.get("candidate_strength_score", 0))
    authenticity_verdict = agent5.get("verdict", "N/A")
    authenticity_score = agent5.get("overall_authenticity_score", 0)
    tech_depth_score = agent6.get("overall_technical_depth_score", 0)
    recruiter_action = agent4.get("recruiter_action", "Review")

    # Summary
    resume_summary = profile.get("summary", "")
    archetype = agent4.get("candidate_archetype", "")
    career_stage = agent4.get("career_stage", "")
    summary = f"{resume_summary} {archetype} in {career_stage} stage."

    # Top recommended roles
    top_roles = agent4.get("top_recommended_roles", [])

    # Verified strengths
    verified_skills = []
    for s in agent2.get("verified_skills", []):
        verified_skills.append({"name": s, "confidence": 90, "sources": ["github", "portfolio"]})
    for s in agent2.get("partially_verified_skills", []):
        verified_skills.append({
            "name": s["skill"],
            "confidence": s["confidence_score"],
            "sources": s["supporting_sources"]
        })
    for s in agent3.get("top_strengths", []):
        if not any(v["name"].lower() == s.lower() for v in verified_skills):
            verified_skills.append({"name": s, "confidence": 80, "sources": ["agent3"]})

    # Key projects
    key_projects = []
    profile_projects = {p["name"]: p for p in profile.get("projects", [])}
    for proj in agent5.get("projects", []):
        profile_proj = profile_projects.get(proj["project_name"], {})
        key_projects.append({
            "name": proj["project_name"],
            "description": profile_proj.get("description", ""),
            "technologies": profile_proj.get("technologies", []),
            "authenticity_score": proj["authenticity_score"],
            "trust_level": proj.get("trust_level", "High"),
            "ai_assistance": proj.get("ai_assistance_level", "Unknown")
        })

    # Technical depth and interview guidance
    skills_assessed = agent6.get("skills_assessed", [])
    strongest_areas = agent6.get("strongest_technical_areas", [])
    weakest_areas = agent6.get("weakest_technical_areas", [])
    suggested_focus = agent6.get("interview_recommendation", {}).get("topics_to_test", [])

    # Education and certifications
    education = profile.get("education", [])
    certifications = agent2.get("verified_certifications", [])

    # Authenticity and risk notes
    risk_flags = agent2.get("risk_flags", [])
    improvement_areas = agent3.get("improvement_areas", [])
    trust_rec = agent5.get("trust_recommendation", "")

    # Build generated profile
    generated_profile = {
        "timestamp": datetime.now().isoformat(),
        "header": {
            "full_name": full_name,
            "target_role": target_role,
            "one_line_pitch": one_line_pitch,
            "contact": contact,
            "links": links
        },
        "scorecard": {
            "overall_strength_score": overall_strength,
            "authenticity_verdict": authenticity_verdict,
            "authenticity_score": authenticity_score,
            "technical_depth_score": tech_depth_score,
            "recruiter_action": recruiter_action
        },
        "summary": summary,
        "top_recommended_roles": top_roles,
        "verified_strengths": verified_skills,
        "key_projects": key_projects,
        "technical_depth_and_interview": {
            "skills_assessed": skills_assessed,
            "strongest_areas": strongest_areas,
            "weakest_areas": weakest_areas,
            "suggested_interview_focus": suggested_focus
        },
        "education_and_certifications": {
            "education": education,
            "certifications": certifications
        },
        "authenticity_and_risk": {
            "risk_flags": risk_flags,
            "improvement_areas": improvement_areas
        },
        "recruiter_recommendation": {
            "trust_recommendation": trust_rec,
            "recruiter_action": recruiter_action
        },
        "source_unified_profile_path": unified_profile_path
    }

    # Save to profile database
    name_slug = full_name.lower().replace(" ", "_").replace(".", "")
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"{name_slug}_{timestamp_str}.json"
    output_path = os.path.join(PROFILE_DB_DIR, output_filename)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(generated_profile, f, ensure_ascii=False, indent=2)

    print(f"Generated and saved profile: {output_path}")
    return output_path


def process_all_new_profiles():
    # Get all unified profiles, check if already processed
    processed_filenames = set()
    for filename in os.listdir(PROFILE_DB_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(PROFILE_DB_DIR, filename), "r", encoding="utf-8") as f:
                data = json.load(f)
                source_path = data.get("source_unified_profile_path")
                if source_path:
                    processed_filenames.add(os.path.basename(source_path))

    # Process new ones
    for filename in os.listdir(STUDENT_DB_DIR):
        if filename.endswith(".json") and filename not in processed_filenames:
            full_path = os.path.join(STUDENT_DB_DIR, filename)
            try:
                generate_profile(full_path)
            except Exception as e:
                print(f"Error processing {filename}: {e}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Process specific file
        target_file = sys.argv[1]
        if os.path.exists(target_file):
            generate_profile(target_file)
    else:
        # Process all new files
        process_all_new_profiles()

