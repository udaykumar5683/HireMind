#!/usr/bin/env python3
"""
Evidence Correlation & Verification Agent for HireMind Platform

This agent verifies candidate claims using evidence from available sources:
- Resume
- GitHub
- Portfolio
- LinkedIn
- HackerRank
- LeetCode
- Certifications
- Personal Website
"""

import json
import os
from typing import Dict, List, Any, Optional
from pathlib import Path


class EvidenceVerifier:
    def __init__(self, candidate_data: Dict[str, Any]):
        self.candidate = candidate_data
        self.profile = candidate_data.get("profile", {})
        self.processed_urls = candidate_data.get("processed_urls", [])

    def extract_skills_from_all_sources(self) -> Dict[str, List[str]]:
        """Extract skills from all available sources"""
        skills = {
            "resume": [],
            "github": [],
            "portfolio": [],
            "hackerrank": [],
            "linkedin": [],
            "leetcode": []
        }

        # From resume
        resume_skills = self.profile.get("skills", {})
        all_resume_skills = []
        for skill_category in resume_skills.values():
            if isinstance(skill_category, list):
                all_resume_skills.extend(skill_category)
        skills["resume"] = list(set(all_resume_skills))

        # From GitHub
        github_data = self._get_github_data()
        if github_data:
            skills["github"] = github_data.get("all_languages", [])
            # Add topics as skills
            topics = set()
            for repo in github_data.get("top_repos", []):
                topics.update(repo.get("topics", []))
            skills["github"].extend(list(topics))

        # From Portfolio
        portfolio_data = self._get_portfolio_data()
        if portfolio_data:
            full_text = portfolio_data.get("full_text", "").lower()
            # Extract skills from portfolio text
            portfolio_skills = []
            common_skills = ["python", "java", "c", "c++", "javascript", "typescript", 
                            "html", "css", "sql", "php", "tensorflow", "pytorch", 
                            "opencv", "flask", "django", "react", "streamlit", "git",
                            "jupyter", "docker", "aws", "gcp", "azure", "hugging face",
                            "langchain", "crewai", "groq", "tavily"]
            for skill in common_skills:
                if skill in full_text:
                    portfolio_skills.append(skill.title())
            skills["portfolio"] = list(set(portfolio_skills))

        # From HackerRank
        hackerrank_data = self._get_hackerrank_data()
        if hackerrank_data and "badges" in hackerrank_data:
            skills["hackerrank"] = [badge["name"] for badge in hackerrank_data["badges"]]

        return skills

    def _get_github_data(self) -> Optional[Dict[str, Any]]:
        """Get GitHub data from processed_urls"""
        for url in self.processed_urls:
            if "github" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "github":
                    return url["data"]
        # Also check profile.github_data
        if "github_data" in self.profile:
            return self.profile["github_data"]
        return None

    def _get_portfolio_data(self) -> Optional[Dict[str, Any]]:
        """Get Portfolio data from processed_urls"""
        for url in self.processed_urls:
            if "portfolio" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "portfolio":
                    return url["data"]
        return None

    def _get_hackerrank_data(self) -> Optional[Dict[str, Any]]:
        """Get HackerRank data from processed_urls"""
        for url in self.processed_urls:
            if "hacker" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "hackerrank":
                    return url["data"]
        return None

    def _get_linkedin_data(self) -> Optional[Dict[str, Any]]:
        """Get LinkedIn data from processed_urls"""
        for url in self.processed_urls:
            if "linkedin" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "linkedin":
                    return url["data"]
        return None

    def verify_skills(self) -> Dict[str, List[Dict[str, Any]]]:
        """Verify each skill claimed by the candidate"""
        verified_skills = []
        partially_verified_skills = []
        unverified_skills = []

        # Get all claimed skills
        claimed_skills = set()
        resume_skills = self.profile.get("skills", {})
        for skill_category in resume_skills.values():
            if isinstance(skill_category, list):
                claimed_skills.update(skill_category)

        # Get skills from all sources
        source_skills = self.extract_skills_from_all_sources()

        for skill in claimed_skills:
            skill_lower = skill.lower()
            supporting_sources = []
            evidence_quality = 0

            # Check each source
            for source, skills_list in source_skills.items():
                skills_list_lower = [s.lower() for s in skills_list]
                if skill_lower in skills_list_lower or any(skill_lower in s.lower() for s in skills_list):
                    supporting_sources.append(source)
                    if source in ["github", "hackerrank"]:
                        evidence_quality += 2  # Strong evidence
                    else:
                        evidence_quality += 1  # Medium/Weak

            verification_status = "unverified"
            confidence_score = 0

            if evidence_quality >= 3 or "github" in supporting_sources:
                verification_status = "verified"
                confidence_score = min(100, 70 + (len(supporting_sources) * 10))
            elif evidence_quality >= 1:
                verification_status = "partially_verified"
                confidence_score = 30 + (len(supporting_sources) * 20)

            skill_result = {
                "skill": skill,
                "verification_status": verification_status,
                "confidence_score": confidence_score,
                "supporting_sources": supporting_sources,
                "reasoning": self._generate_skill_reasoning(skill, verification_status, supporting_sources)
            }

            if verification_status == "verified":
                verified_skills.append(skill_result)
            elif verification_status == "partially_verified":
                partially_verified_skills.append(skill_result)
            else:
                unverified_skills.append(skill_result)

        return {
            "verified_skills": verified_skills,
            "partially_verified_skills": partially_verified_skills,
            "unverified_skills": unverified_skills
        }

    def _generate_skill_reasoning(self, skill: str, status: str, sources: List[str]) -> str:
        """Generate reasoning for skill verification"""
        if status == "verified":
            if len(sources) > 1:
                return f"Skill '{skill}' is verified by multiple sources: {', '.join(sources)}"
            else:
                return f"Skill '{skill}' is verified by strong evidence from {sources[0]}"
        elif status == "partially_verified":
            return f"Skill '{skill}' is mentioned in {', '.join(sources)}, but limited supporting evidence"
        else:
            return f"Skill '{skill}' is claimed but no supporting evidence found in available sources"

    def verify_projects(self) -> List[Dict[str, Any]]:
        """Verify projects from candidate profile"""
        verified_projects = []
        claimed_projects = self.profile.get("projects", [])
        github_projects = self._get_github_projects()
        portfolio_projects = self._get_portfolio_projects()

        for project in claimed_projects:
            project_name = project.get("name", "")
            project_technologies = project.get("technologies", [])
            verification_status = "unverified"
            confidence_score = 0
            supporting_sources = []

            # Check GitHub
            for gh_project in github_projects:
                if project_name.lower().replace(" ", "-") in gh_project["name"].lower().replace(" ", "-") or \
                   any(tech.lower() in (gh_project.get("description") or "").lower() for tech in project_technologies):
                    verification_status = "verified"
                    confidence_score = 90
                    supporting_sources.append("github")
                    break

            # Check Portfolio
            if verification_status == "unverified":
                portfolio_text = self._get_portfolio_data().get("full_text", "").lower() if self._get_portfolio_data() else ""
                if project_name.lower() in portfolio_text:
                    verification_status = "partially_verified"
                    confidence_score = 60
                    supporting_sources.append("portfolio")

            verified_projects.append({
                "project_name": project_name,
                "verification_status": verification_status,
                "confidence_score": confidence_score,
                "supporting_sources": supporting_sources,
                "reasoning": self._generate_project_reasoning(project_name, verification_status, supporting_sources)
            })

        return verified_projects

    def _get_github_projects(self) -> List[Dict[str, Any]]:
        """Get projects from GitHub data"""
        github_data = self._get_github_data()
        if github_data:
            if "top_repos" in github_data:
                return github_data["top_repos"]
            if "repositories" in github_data:
                return github_data["repositories"]
        return []

    def _get_portfolio_projects(self) -> List[str]:
        """Get projects from portfolio data"""
        portfolio_data = self._get_portfolio_data()
        if portfolio_data:
            sections = portfolio_data.get("sections", [])
            return [s["text"] for s in sections if s["level"] == "h2" and any(w in s["text"].lower() for w in ["system", "project", "management"])]
        return []

    def _generate_project_reasoning(self, project_name: str, status: str, sources: List[str]) -> str:
        """Generate reasoning for project verification"""
        if status == "verified":
            return f"Project '{project_name}' is verified with evidence from {', '.join(sources)}"
        elif status == "partially_verified":
            return f"Project '{project_name}' is mentioned in {', '.join(sources)}, but limited detailed evidence"
        else:
            return f"Project '{project_name}' is claimed but no supporting evidence found in available sources"

    def verify_certifications(self) -> List[Dict[str, Any]]:
        """Verify certifications from candidate profile"""
        verified_certs = []
        claimed_certs = self.profile.get("certifications", [])

        for cert in claimed_certs:
            # Currently, no direct evidence source for certifications
            # So mark as partially verified if claimed
            verified_certs.append({
                "certification": cert,
                "verification_status": "partially_verified",
                "confidence_score": 30,
                "supporting_sources": ["resume"],
                "reasoning": f"Certification '{cert}' is listed on resume, no external verification source available"
            })

        return verified_certs

    def calculate_credibility_score(self, skill_results: Dict, project_results: List, cert_results: List) -> Dict[str, float]:
        """Calculate overall credibility score"""
        total_skills = len(skill_results["verified_skills"]) + len(skill_results["partially_verified_skills"]) + len(skill_results["unverified_skills"])
        total_projects = len(project_results)
        
        resume_consistency = 80.0  # Base consistency
        skill_verification = 0.0
        project_verification = 0.0
        
        if total_skills > 0:
            skill_verification = (len(skill_results["verified_skills"]) * 1 + len(skill_results["partially_verified_skills"]) * 0.5) / total_skills * 100
        
        if total_projects > 0:
            verified_project_count = sum(1 for p in project_results if p["verification_status"] == "verified")
            partially_verified_count = sum(1 for p in project_results if p["verification_status"] == "partially_verified")
            project_verification = (verified_project_count * 1 + partially_verified_count * 0.5) / total_projects * 100
        
        profile_evidence_strength = 70.0 if len(self.processed_urls) >= 3 else 50.0
        
        overall_credibility = (resume_consistency * 0.2 + skill_verification * 0.3 + 
                              project_verification * 0.3 + profile_evidence_strength * 0.2)
        
        return {
            "resume_consistency": round(resume_consistency, 1),
            "skill_verification": round(skill_verification, 1),
            "project_verification": round(project_verification, 1),
            "profile_evidence_strength": round(profile_evidence_strength, 1),
            "overall_credibility_score": round(overall_credibility, 1)
        }

    def generate_risk_flags(self, skill_results: Dict, project_results: List) -> List[Dict[str, Any]]:
        """Generate evidence-backed risk flags"""
        risk_flags = []
        
        # Check for unverified skills
        for skill in skill_results["unverified_skills"]:
            risk_flags.append({
                "severity": "low",
                "issue": "Skill claimed but no supporting evidence found",
                "affected_skill": skill["skill"]
            })
        
        # Check for projects with low confidence
        for project in project_results:
            if project["verification_status"] == "unverified":
                risk_flags.append({
                    "severity": "medium",
                    "issue": "Project claimed but no supporting evidence found",
                    "affected_project": project["project_name"]
                })
        
        return risk_flags

    def generate_full_report(self) -> Dict[str, Any]:
        """Generate complete verification report"""
        skill_results = self.verify_skills()
        project_results = self.verify_projects()
        cert_results = self.verify_certifications()
        credibility_score = self.calculate_credibility_score(skill_results, project_results, cert_results)
        risk_flags = self.generate_risk_flags(skill_results, project_results)
        
        return {
            "verified_skills": skill_results["verified_skills"],
            "partially_verified_skills": skill_results["partially_verified_skills"],
            "unverified_skills": skill_results["unverified_skills"],
            "verified_projects": project_results,
            "verified_certifications": cert_results,
            "credibility_score": credibility_score,
            "risk_flags": risk_flags,
            "evidence_summary": {
                "total_verified_skills": len(skill_results["verified_skills"]),
                "total_verified_projects": sum(1 for p in project_results if p["verification_status"] == "verified"),
                "total_verified_certifications": len(cert_results)
            }
        }


def main():
    store_path = Path("e:/Resume Parser/Database/agent1_output")
    output_path = Path("e:/Resume Parser/Database/agent2_output")
    output_path.mkdir(exist_ok=True, parents=True)
    
    if not store_path.exists():
        print("agent1_output folder not found!")
        return
    
    # Process all JSON files in Store folder
    for json_file in store_path.glob("profile_*.json"):
        print(f"\nProcessing: {json_file.name}")
        
        with open(json_file, "r", encoding="utf-8") as f:
            candidate_data = json.load(f)
        
        verifier = EvidenceVerifier(candidate_data)
        report = verifier.generate_full_report()
        
        # Save report
        output_file = output_path / f"verification_{json_file.name}"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"Report saved to: {output_file}")
        print(f"Overall credibility score: {report['credibility_score']['overall_credibility_score']}")


if __name__ == "__main__":
    main()
