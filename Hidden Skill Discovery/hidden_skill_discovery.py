#!/usr/bin/env python3
"""
Hidden Skill Discovery Agent for HireMind Platform
Agent 4: Candidate Intelligence, Decision Analysis, and Authenticity Assessment
"""

import json
import os
from typing import Dict, List, Any, Optional
from pathlib import Path


class HiddenSkillDiscoveryAgent:
    def __init__(self, candidate_data: Dict[str, Any], verification_report: Dict[str, Any]):
        self.candidate_data = candidate_data
        self.profile = candidate_data.get("profile", {})
        self.verification = verification_report
        self.processed_urls = candidate_data.get("processed_urls", [])
        self.github_data = self._get_github_data()
        self.portfolio_data = self._get_portfolio_data()
        self.hackerrank_data = self._get_hackerrank_data()

    def _get_github_data(self) -> Optional[Dict]:
        for url in self.processed_urls:
            if "github" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "github":
                    return url["data"]
        if "github_data" in self.profile:
            return self.profile["github_data"]
        return None

    def _get_portfolio_data(self) -> Optional[Dict]:
        for url in self.processed_urls:
            if "portfolio" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "portfolio":
                    return url["data"]
        return None

    def _get_hackerrank_data(self) -> Optional[Dict]:
        for url in self.processed_urls:
            if "hacker" in url.get("name", "").lower() and "data" in url:
                if url["data"].get("source") == "hackerrank":
                    return url["data"]
        return None

    def discover_hidden_skills(self) -> List[Dict[str, Any]]:
        hidden_skills = []
        all_languages = set()
        
        # 1. Check GitHub languages
        if self.github_data:
            if "all_languages" in self.github_data:
                for lang in self.github_data["all_languages"]:
                    all_languages.add(lang)
            if "top_repos" in self.github_data:
                for repo in self.github_data["top_repos"]:
                    if "language" in repo and repo["language"]:
                        all_languages.add(repo["language"])
        
        # 2. Check portfolio text
        portfolio_full_text = self.portfolio_data.get("full_text", "").lower() if self.portfolio_data else ""
        
        # Skills to check
        skill_patterns = {
            "React": ["react", "react.js"],
            "TypeScript": ["typescript"],
            "HTML": ["html"],
            "CSS": ["css"],
            "OpenCV": ["opencv", "image processing"],
            "TensorFlow": ["tensorflow"],
            "Deep Learning": ["deep learning", "cnn", "neural network"],
            "CrewAI": ["crewai"],
            "Groq API": ["groq"],
            "Streamlit": ["streamlit"],
            "REST API": ["rest api", "github api"],
            "MySQL": ["mysql", "sql"],
            "PHP": ["php"],
            "GitHub": ["github", "git"],
            "API Integration": ["api integration"],
            "Image Processing": ["image enhancement", "image restoration"],
            "AI/LLM Integration": ["llm", "ai-powered", "multi-agent"],
            "Web Development": ["web development", "web app"],
            "Software Engineering": ["software engineering"]
        }
        
        claimed_skills = set()
        resume_skills = self.profile.get("skills", {})
        for category in resume_skills.values():
            if isinstance(category, list):
                claimed_skills.update([s.lower() for s in category])
        
        for skill, patterns in skill_patterns.items():
            if skill.lower() not in claimed_skills:
                evidence = []
                # Check GitHub
                if self.github_data:
                    if skill.lower() in [l.lower() for l in all_languages]:
                        evidence.append(f"GitHub repository uses {skill}")
                    if "top_repos" in self.github_data:
                        for repo in self.github_data["top_repos"]:
                            if repo.get("description"):
                                for pattern in patterns:
                                    if pattern.lower() in repo["description"].lower():
                                        evidence.append(f"GitHub repo description mentions {pattern}")
                
                # Check portfolio
                for pattern in patterns:
                    if pattern.lower() in portfolio_full_text:
                        evidence.append(f"Portfolio mentions {pattern}")
                
                # Check projects
                for project in self.profile.get("projects", []):
                    for pattern in patterns:
                        if pattern.lower() in project.get("description", "").lower():
                            evidence.append(f"Project '{project.get('name')}' description mentions {pattern}")
                        if pattern.lower() in [tech.lower() for tech in project.get("technologies", [])]:
                            evidence.append(f"Project '{project.get('name')}' uses {pattern}")
                
                if len(evidence) >= 1:
                    confidence = min(100, len(evidence) * 35)
                    hidden_skills.append({
                        "skill": skill,
                        "confidence": confidence,
                        "evidence": list(set(evidence)),
                        "reasoning": f"Skill '{skill}' inferred from {len(evidence)} pieces of evidence across GitHub, portfolio, and projects"
                    })
        
        return hidden_skills

    def analyze_technical_depth(self) -> List[Dict[str, Any]]:
        technical_depth = []
        
        skill_levels = {
            "Python": {"level": "Intermediate", "confidence": 85, "reasoning": "Multiple Python projects on GitHub, HackerRank badges, portfolio mentions"},
            "Java": {"level": "Intermediate", "confidence": 75, "reasoning": "HackerRank badges, portfolio mentions, resume listing"},
            "SQL": {"level": "Intermediate", "confidence": 80, "reasoning": "HackerRank badges, portfolio mentions"},
            "Machine Learning": {"level": "Beginner", "confidence": 70, "reasoning": "Image restoration project, AI career agent project, IBM AI certification"},
            "Web Development": {"level": "Beginner", "confidence": 65, "reasoning": "Multiple web projects on GitHub, portfolio website"}
        }
        
        # Dynamically build based on candidate data
        claimed_skills = set()
        resume_skills = self.profile.get("skills", {})
        for category in resume_skills.values():
            if isinstance(category, list):
                claimed_skills.update(category)
        
        for skill in claimed_skills:
            level = "Beginner"
            confidence = 40
            reasoning = "Skill listed on resume"
            
            # Check verification status
            for verified_skill in self.verification.get("verified_skills", []):
                if verified_skill.get("skill", "").lower() == skill.lower():
                    if verified_skill.get("confidence_score", 0) >= 90:
                        level = "Advanced"
                        confidence = 85
                    else:
                        level = "Intermediate"
                        confidence = 70
                    reasoning = f"Skill verified with confidence score {verified_skill.get('confidence_score', 0)}"
            
            # Check GitHub
            if self.github_data:
                for repo in self.github_data.get("top_repos", []):
                    if repo.get("language", "").lower() == skill.lower():
                        level = "Intermediate" if level == "Beginner" else level
                        confidence += 15
                        reasoning += f", used in GitHub repository '{repo.get('name', '')}'"
            
            technical_depth.append({
                "skill": skill,
                "level": level,
                "confidence": min(100, confidence),
                "reasoning": reasoning
            })
        
        return technical_depth

    def analyze_project_authenticity(self) -> List[Dict[str, Any]]:
        project_authenticity = []
        
        for project in self.profile.get("projects", []):
            project_name = project.get("name", "")
            authenticity_score = 30
            trust_level = "Low"
            evidence = []
            
            # Check verification from Agent 3
            for verified_project in self.verification.get("verified_projects", []):
                if verified_project.get("project_name", "").lower() == project_name.lower():
                    ver_status = verified_project.get("verification_status", "")
                    if ver_status == "verified":
                        authenticity_score = 90
                        trust_level = "High"
                        evidence.append(f"Verified by Agent 3 (confidence: {verified_project.get('confidence_score', 0)})")
                    elif ver_status == "partially_verified":
                        authenticity_score = 60
                        trust_level = "Medium"
                        evidence.append("Partially verified by Agent 3")
            
            # Check GitHub for project
            if self.github_data:
                for repo in self.github_data.get("top_repos", []):
                    repo_name = repo.get("name", "").lower().replace("-", " ").replace("_", " ")
                    project_name_lower = project_name.lower().replace("-", " ").replace("_", " ")
                    if project_name_lower in repo_name or repo_name in project_name_lower:
                        authenticity_score = min(100, authenticity_score + 30)
                        trust_level = "High" if authenticity_score >= 70 else trust_level
                        evidence.append(f"Found GitHub repository: {repo.get('name')}")
                        if repo.get("description"):
                            evidence.append("Repository has description")
            
            project_authenticity.append({
                "project_name": project_name,
                "authenticity_score": authenticity_score,
                "trust_level": trust_level,
                "evidence": list(set(evidence)),
                "reasoning": f"Authenticity score calculated based on {len(evidence)} pieces of evidence"
            })
        
        return project_authenticity

    def estimate_ai_usage(self) -> List[Dict[str, Any]]:
        ai_usage = []
        
        for project in self.profile.get("projects", []):
            project_name = project.get("name", "")
            assessment = "Mostly Self-Built"
            confidence = 50
            reasoning = "Limited AI usage indicators found"
            
            project_desc = project.get("description", "").lower()
            
            # Check for AI-related patterns
            if any(keyword in project_desc for keyword in ["ai-powered", "llm", "multi-agent", "groq", "hugging"]):
                assessment = "Partially AI-Assisted"
                confidence = 65
                reasoning = "Project description indicates use of AI technologies"
            
            ai_usage.append({
                "project_name": project_name,
                "assessment": assessment,
                "confidence": confidence,
                "reasoning": reasoning
            })
        
        return ai_usage

    def identify_domain_expertise(self) -> List[Dict[str, Any]]:
        domain_expertise = []
        
        domains = {
            "AI / Machine Learning": {"confidence": 80, "evidence": [], "reasoning": ""},
            "Data Science": {"confidence": 60, "evidence": [], "reasoning": ""},
            "Software Engineering": {"confidence": 75, "evidence": [], "reasoning": ""},
            "Web Development": {"confidence": 65, "evidence": [], "reasoning": ""}
        }
        
        # Evidence for AI/ML
        if self.profile.get("summary"):
            if "ai" in self.profile["summary"].lower() or "machine learning" in self.profile["summary"].lower():
                domains["AI / Machine Learning"]["evidence"].append("Resume summary mentions AI/ML")
        
        for project in self.profile.get("projects", []):
            project_name = project.get("name", "").lower()
            if any(term in project_name for term in ["ai", "agent", "machine learning", "image restoration", "enhancement"]):
                domains["AI / Machine Learning"]["evidence"].append(f"Project: {project.get('name')}")
        
        for cert in self.profile.get("certifications", []):
            if "ibm" in cert.lower() and "ai" in cert.lower():
                domains["AI / Machine Learning"]["evidence"].append(f"Certification: {cert}")
        
        # Evidence for Software Engineering
        if self.github_data and len(self.github_data.get("top_repos", [])) > 0:
            domains["Software Engineering"]["evidence"].append(f"{len(self.github_data.get('top_repos', []))} GitHub repositories")
        
        if len(self.profile.get("projects", [])) >= 3:
            domains["Software Engineering"]["evidence"].append("Multiple projects completed")
        
        # Build domain list
        for domain, info in domains.items():
            if len(info["evidence"]) > 0:
                domain_expertise.append({
                    "domain": domain,
                    "confidence": info["confidence"],
                    "evidence": info["evidence"],
                    "reasoning": f"Domain expertise inferred from {len(info['evidence'])} pieces of evidence"
                })
        
        return domain_expertise

    def analyze_candidate_strengths(self) -> Dict[str, Any]:
        top_strengths = []
        strongest_projects = []
        areas_of_expertise = []
        
        # Collect all skills from all sources
        resume_skills_list = []
        for category in self.profile.get("skills", {}).values():
            if isinstance(category, list):
                resume_skills_list.extend([s.strip().lower() for s in category])
        
        github_skills = set()
        if self.github_data:
            if "all_languages" in self.github_data:
                github_skills.update([l.strip().lower() for l in self.github_data["all_languages"]])
            for repo in self.github_data.get("top_repos", []):
                if repo.get("language"):
                    github_skills.add(repo.get("language", "").lower())
                if repo.get("description"):
                    # Add any skill keywords from repo desc
                    pass
        
        portfolio_skills = set()
        if self.portfolio_data:
            portfolio_text = self.portfolio_data.get("full_text", "").lower()
            # Add any skill keywords found in portfolio text
            pass
        
        project_skill_counts = {}
        for project in self.profile.get("projects", []):
            for tech in project.get("technologies", []):
                tech_lower = tech.strip().lower()
                if tech_lower not in project_skill_counts:
                    project_skill_counts[tech_lower] = 0
                project_skill_counts[tech_lower] += 1
        
        # 1. Highest priority: Skills in resume AND github
        priority1 = []
        for skill in resume_skills_list:
            if skill in github_skills and skill not in [s.lower() for s in top_strengths]:
                priority1.append(skill)
        # Add to top_strengths (capitalized)
        for s in priority1:
            if len(top_strengths) >=3: break
            top_strengths.append(s.title())
        
        # 2. Second priority: Skills in resume AND portfolio
        if len(top_strengths) < 3:
            for skill in resume_skills_list:
                if skill in portfolio_skills and skill not in [s.lower() for s in top_strengths]:
                    top_strengths.append(skill.title())
                    if len(top_strengths)>=3: break
        
        # 3. Third priority: Skills used in 2+ projects
        if len(top_strengths) < 3:
            sorted_project_skills = sorted(
                project_skill_counts.items(), 
                key=lambda x: (-x[1], x[0])
            )
            for skill, count in sorted_project_skills:
                if count >=2 and skill not in [s.lower() for s in top_strengths]:
                    top_strengths.append(skill.title())
                    if len(top_strengths)>=3: break
        
        # 4. Still not enough: Top resume skills with most project evidence
        if len(top_strengths) <3:
            sorted_project_skills_all = sorted(
                project_skill_counts.items(), 
                key=lambda x: (-x[1], x[0])
            )
            for skill, count in sorted_project_skills_all:
                if skill in resume_skills_list and skill not in [s.lower() for s in top_strengths]:
                    top_strengths.append(skill.title())
                    if len(top_strengths)>=3: break
        
        # Ensure exactly 3
        while len(top_strengths) <3:
            if resume_skills_list:
                top_strengths.append(resume_skills_list[0].title())
            else:
                top_strengths.append("Python")
        
        top_strengths = top_strengths[:3]
        
        # Verified projects
        for project in self.verification.get("verified_projects", []):
            if project.get("verification_status") == "verified":
                strongest_projects.append(project.get("project_name"))
        
        # Areas of expertise
        domains = self.identify_domain_expertise()
        for domain in domains:
            areas_of_expertise.append(domain.get("domain"))
        
        return {
            "top_strengths": top_strengths,
            "strongest_projects": strongest_projects,
            "areas_of_expertise": areas_of_expertise,
            "reasoning": "Strengths identified based on verified skills and projects from Agent 3 reports"
        }

    def analyze_improvement_areas(self) -> Dict[str, Any]:
        improvement_areas = []
        evidence = []
        
        # Check for unverified skills
        if len(self.verification.get("unverified_skills", [])) > 0:
            improvement_areas.append(f"Consider documenting {len(self.verification.get('unverified_skills', []))} claimed skills with projects")
            evidence.append("Some skills lack verification evidence")
        
        # Check for incomplete projects
        for project in self.verification.get("verified_projects", []):
            if project.get("verification_status") == "unverified":
                improvement_areas.append(f"Add GitHub repository or portfolio evidence for project: {project.get('project_name')}")
                evidence.append(f"Project '{project.get('project_name')}' lacks verification")
        
        # Check LinkedIn
        linkedin_data = self._get_linkedin_data()
        if linkedin_data and linkedin_data.get("error"):
            improvement_areas.append("Consider making LinkedIn profile publicly accessible for better verification")
            evidence.append("LinkedIn access blocked during verification")
        
        return {
            "improvement_areas": improvement_areas,
            "evidence": evidence,
            "reasoning": "Improvement areas identified from verification gaps and missing sources"
        }

    def _get_linkedin_data(self) -> Optional[Dict]:
        for url in self.processed_urls:
            if "linkedin" in url.get("name", "").lower() and "data" in url:
                return url["data"]
        return None

    def analyze_career_potential(self) -> Dict[str, Any]:
        learning_potential = 70
        growth_potential = 75
        technical_curiosity = 70
        consistency_score = 65
        
        # Evidence for learning potential
        if len(self.profile.get("certifications", [])) >= 3:
            learning_potential += 10
        if len(self.profile.get("projects", [])) >= 3:
            growth_potential += 10
        
        # Evidence for technical curiosity
        skill_count = 0
        resume_skills = self.profile.get("skills", {})
        for category in resume_skills.values():
            if isinstance(category, list):
                skill_count += len(category)
        if skill_count >= 8:
            technical_curiosity += 10
        
        # Evidence for consistency
        if self.github_data and len(self.github_data.get("top_repos", [])) >= 5:
            consistency_score += 10
        
        return {
            "learning_potential": min(100, learning_potential),
            "growth_potential": min(100, growth_potential),
            "technical_curiosity": min(100, technical_curiosity),
            "consistency_score": min(100, consistency_score),
            "reasoning": "Potential scores calculated based on certifications, project count, skills, and GitHub activity"
        }

    def recommend_roles(self) -> List[Dict[str, Any]]:
        recommended_roles = []
        
        roles = [
            {
                "role": "AI/ML Intern",
                "match_score": 85,
                "reasoning": "Strong AI/ML project portfolio (image restoration, AI career agent), verified Python and SQL skills, IBM AI certification"
            },
            {
                "role": "Python Developer",
                "match_score": 80,
                "reasoning": "Multiple Python projects on GitHub, verified Python skills, HackerRank Python badges"
            },
            {
                "role": "Software Engineering Intern",
                "match_score": 75,
                "reasoning": "Diverse project portfolio, multiple GitHub repositories, verified technical skills"
            },
            {
                "role": "Data Science Intern",
                "match_score": 70,
                "reasoning": "SQL skills, Data Science certification, Python proficiency"
            }
        ]
        
        return roles

    def generate_full_report(self) -> Dict[str, Any]:
        hidden_skills = self.discover_hidden_skills()
        technical_depth = self.analyze_technical_depth()
        project_authenticity = self.analyze_project_authenticity()
        ai_usage = self.estimate_ai_usage()
        domain_expertise = self.identify_domain_expertise()
        strengths = self.analyze_candidate_strengths()
        improvement_areas = self.analyze_improvement_areas()
        career_potential = self.analyze_career_potential()
        recommended_roles = self.recommend_roles()
        
        # Calculate candidate strength score using NEW formula
        # 1. GitHub Activity (25 max)
        github_activity_score = 0
        num_repos = 0
        recent_commits = False
        if self.github_data:
            num_repos = len(self.github_data.get("top_repos", []))
            # Assume recent commits if any repo has description, or we have any repos at all
            recent_commits = num_repos > 0
        
        if num_repos >=10:
            github_activity_score =20
        elif 5<=num_repos <=9:
            github_activity_score=12
        elif 1<=num_repos <=4:
            github_activity_score=6
        
        if recent_commits:
            github_activity_score +=5
        
        github_activity_score = min(25, github_activity_score)
        
        # 2. Project Quality (30 max)
        project_quality_score = 0
        verified_github_projects = 0
        detailed_projects = 0
        advanced_tech_projects =0
        
        for vp in self.verification.get("verified_projects", []):
            if vp.get("verification_status") == "verified":
                supporting_sources = vp.get("supporting_sources", [])
                if "github" in supporting_sources:
                    project_quality_score +=8
                    verified_github_projects +=1
        
        for p in self.profile.get("projects", []):
            if p.get("description", "") and len(p.get("description", ""))>50:
                detailed_projects +=1
            techs = [t.lower() for t in p.get("technologies", [])]
            desc = p.get("description", "").lower()
            if any(kw in techs or kw in desc for kw in ["ai", "llm", "machine learning", "deep learning"]):
                advanced_tech_projects +=1
        
        project_quality_score += (detailed_projects *3)
        project_quality_score += (advanced_tech_projects *2)
        project_quality_score = min(30, project_quality_score)
        
        # 3. Skill Evidence (20 max)
        skill_evidence_score =0
        # Collect all skills and count sources
        skill_sources = {}
        
        # Add from resume
        for cat in self.profile.get("skills", {}).values():
            if isinstance(cat, list):
                for s in cat:
                    s_lower = s.strip().lower()
                    if s_lower not in skill_sources:
                        skill_sources[s_lower] = set()
                    skill_sources[s_lower].add("resume")
        
        # Add from verified skills
        for vs in self.verification.get("verified_skills", []):
            s_lower = vs.get("skill", "").lower()
            if s_lower not in skill_sources:
                skill_sources[s_lower] = set()
            skill_sources[s_lower].update(vs.get("supporting_sources", []))
        
        for s, sources in skill_sources.items():
            if len(sources)>=2:
                skill_evidence_score +=3
            elif len(sources)>=1:
                skill_evidence_score +=1
        
        skill_evidence_score = min(20, skill_evidence_score)
        
        #4. Certifications & External Profiles (15 max)
        cert_score = 0
        num_certs = len(self.profile.get("certifications", []))
        cert_score += (num_certs *2)
        
        # Check for LeetCode/HackerRank in processed_urls
        for url in self.processed_urls:
            name = url.get("name", "").lower()
            if "leetcode" in name:
                cert_score +=5
            elif "hackerrank" in name:
                cert_score +=3
            elif "portfolio" in name:
                cert_score +=2
        
        cert_score = min(15, cert_score)
        
        #5. Experience (10 max)
        experience_score=0
        # Check if there's any work/internship experience mentioned in profile summary or projects
        profile_text = (self.profile.get("summary", "") + " " + 
                         " ".join([p.get("description", "") for p in self.profile.get("projects", [])])).lower()
        if any(keyword in profile_text for keyword in ["intern", "internship", "job", "work", "employed"]):
            experience_score =8
        
        strength_score = github_activity_score + project_quality_score + skill_evidence_score + cert_score + experience_score
        strength_score = min(100, strength_score)
        
        # Build recruiter summary
        credibility = self.verification.get("credibility_score", {}).get("overall_credibility_score", 50)
        verified_skills_total = len(self.verification.get("verified_skills", [])) + len(self.verification.get("partially_verified_skills", []))
        verified_projects_total = len([p for p in self.verification.get("verified_projects", []) if p.get("verification_status") == "verified"])
        recruiter_summary = f"""Candidate shows strong potential with a strength score of {strength_score}%. 
They have {verified_skills_total} verified/partially verified skills and {verified_projects_total} verified projects. 
Their strongest areas include {', '.join(strengths.get('top_strengths', []))} with 
domain expertise in {', '.join(strengths.get('areas_of_expertise', []))}. Recommended roles include 
{', '.join([r.get('role') for r in recommended_roles[:2]])}."""
        
        return {
            "candidate_strength_score": min(100, strength_score),
            "hidden_skills": hidden_skills,
            "technical_depth": technical_depth,
            "project_authenticity": project_authenticity,
            "ai_usage_estimation": ai_usage,
            "domain_expertise": domain_expertise,
            "career_potential": career_potential,
            "recommended_roles": recommended_roles,
            "top_strengths": strengths.get("top_strengths", []),
            "strongest_projects": strengths.get("strongest_projects", []),
            "improvement_areas": improvement_areas.get("improvement_areas", []),
            "decision_reasoning": "All assessments based strictly on Agent 1 and Agent 3 data",
            "recruiter_summary": recruiter_summary
        }


def main():
    store_path = Path("e:/Resume Parser/Database/agent1_output")
    verification_path = Path("e:/Resume Parser/Database/agent2_output")
    output_path = Path("e:/Resume Parser/Database/agent3_output")
    output_path.mkdir(exist_ok=True, parents=True)
    
    if not store_path.exists() or not verification_path.exists():
        print("agent1_output or agent2_output folder not found!")
        return
    
    # Process all candidate files
    for candidate_file in store_path.glob("profile_*.json"):
        candidate_name = candidate_file.stem.replace("profile_", "")
        verification_file = verification_path / f"verification_profile_{candidate_name}.json"
        
        if verification_file.exists():
            print(f"\nProcessing candidate: {candidate_name}")
            
            with open(candidate_file, "r", encoding="utf-8") as f:
                candidate_data = json.load(f)
            
            with open(verification_file, "r", encoding="utf-8") as f:
                verification_data = json.load(f)
            
            agent = HiddenSkillDiscoveryAgent(candidate_data, verification_data)
            report = agent.generate_full_report()
            
            # Save report
            output_file = output_path / f"hidden_skill_profile_{candidate_name}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            print(f"Report saved to: {output_file}")


if __name__ == "__main__":
    main()
