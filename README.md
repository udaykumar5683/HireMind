# 🧠 HireMind — AI Assessment & Proctoring
<img width="1536" height="1024" alt="ai agent" src="https://github.com/user-attachments/assets/dbf7c6d3-0a80-43b9-94a9-b86c5fd15f13" />


> **An AI-powered assessment and proctoring system for evidence-based candidate evaluation.**

HireMind is an AI-native recruitment intelligence platform designed to improve the way candidates are evaluated during the hiring process.

The **AI Assessment & Proctoring module** extends HireMind's multi-agent recruitment workflow by providing role-specific technical assessments, automated evaluation, real-time assessment monitoring, integrity analysis, skill-wise performance analysis, and recruiter-ready assessment reports.

Instead of relying only on resumes and keyword matching, HireMind combines **candidate intelligence + assessment performance + assessment integrity** to provide recruiters with deeper and more transparent hiring insights.

---

## 🚀 Why HireMind?

Traditional recruitment systems often depend heavily on:

* Resume keywords
* Manual resume screening
* Basic aptitude tests
* Limited candidate evidence
* Manual assessment evaluation
* Incomplete visibility into candidate performance

This can result in qualified candidates being overlooked while recruiters spend significant time evaluating large numbers of applicants.

HireMind addresses this problem by combining:

```text
Candidate Profile
      +
Multi-Agent Candidate Intelligence
      +
Role-Specific Assessment
      +
AI Proctoring
      +
Assessment Performance
      ↓
Evidence-Based Candidate Evaluation
```

---

# 🎯 Core Objectives

The AI Assessment & Proctoring system is designed to:

* Generate assessments based on job requirements
* Provide consistent assessments to candidates
* Automatically evaluate candidate responses
* Measure skill-wise technical performance
* Monitor assessment integrity
* Detect suspicious assessment events
* Generate an assessment integrity score
* Produce transparent assessment reports
* Improve recruiter decision-making
* Integrate assessment performance with HireMind's existing candidate ranking system

---

# 🏗️ HireMind Recruitment Workflow

The assessment module is one stage of the larger HireMind recruitment intelligence pipeline.

```text
                    JOB POSTING
                         │
                         ▼
                 JOB DESCRIPTION
                         │
                         ▼
              ┌─────────────────────┐
              │   AI AGENT SYSTEM   │
              └─────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Resume Parser    Role Match    Evidence Analysis
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                Hidden Skill Discovery
                         │
                         ▼
               Technical Depth Analysis
                         │
                         ▼
              Candidate Ranking / Cutoff
                         │
                  ┌──────┴──────┐
                  │             │
                Reject      Shortlisted
                                │
                                ▼
                     AI ASSESSMENT SYSTEM
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
          Assessment Engine            Proctoring Engine
                  │                           │
                  └─────────────┬─────────────┘
                                ▼
                    Evaluation & Scoring
                                │
                                ▼
                     Assessment Report
                                │
                                ▼
                    Final Candidate Ranking
                                │
                                ▼
                  Recruiter Intelligence Report
                                │
                                ▼
                       Hiring Decision
```

This follows the HireMind workflow where shortlisted candidates complete a role-specific assessment and the resulting performance is incorporated into candidate ranking and recruiter insights.

---

# 🧩 Major Components

## 1. AI Assessment Generator

When a recruiter creates a job, HireMind analyzes the job description and automatically generates a role-specific assessment.

The assessment is generated **once and stored**, rather than generating new questions every time a candidate starts the assessment.

### Assessment structure

```text
Job Description
      ↓
AI Assessment Generator
      ↓
30 Questions
      │
      ├── 5 Easy
      ├── 15 Medium
      └── 10 Hard
      ↓
Question Bank
      ↓
Candidate Assessment
```

Each question can contain metadata such as:

```json
{
  "questionId": "Q001",
  "question": "Example question",
  "options": [
    "Option A",
    "Option B",
    "Option C",
    "Option D"
  ],
  "correctAnswer": "B",
  "difficulty": "medium",
  "skill": "Python",
  "topic": "Object Oriented Programming",
  "points": 1
}
```

### Why store questions?

Storing the generated assessment provides:

* Consistent evaluation
* Faster assessment loading
* Reduced unnecessary LLM calls
* Reproducible results
* Better assessment management
* Easier auditing

---

# 📝 2. Candidate Assessment Engine

The candidate receives an assessment invitation after being shortlisted.

### Candidate flow

```text
Assessment Invitation
        ↓
Assessment Instructions
        ↓
System Compatibility Check
        ↓
Camera / Permission Check
        ↓
Fullscreen
        ↓
Start Assessment
        ↓
Answer Questions
        ↓
Submit Assessment
        ↓
Automatic Evaluation
        ↓
Assessment Report
```

### Assessment features

* 30 role-specific MCQs
* Difficulty-based questions
* Countdown timer
* Question navigation
* Answer selection
* Answer persistence
* Previous / Next navigation
* Assessment progress
* Automatic submission
* Time-based submission
* Score calculation

---

# 🛡️ 3. AI Proctoring

The AI Proctoring Engine monitors assessment integrity using multiple independent signals.

Rather than allowing a single AI prediction to determine whether a candidate cheated, HireMind records individual events and combines them into an **Assessment Integrity Score**.

### Proctoring signals

```text
                 AI PROCTORING
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
 Face Detection   Browser Events   Screen State
       │               │                │
       ├─ Face        ├─ Tab Switch    ├─ Fullscreen
       ├─ No Face     └─ Window Change └─ Exit
       └─ Multiple
          Faces
       │
       ▼
  Suspicious Event Engine
       │
       ▼
 Integrity Analysis
```

---

# 👁️ Proctoring Events

The system can record events such as:

### Face Monitoring

* Face detected
* Face not visible
* Multiple faces detected
* Repeated face absence

### Browser Monitoring

* Tab switching
* Window switching
* Assessment window lost

### Fullscreen Monitoring

* Fullscreen entered
* Fullscreen exited
* Repeated fullscreen exits

### Object / Environment Monitoring

Where supported:

* Mobile phone detection
* Suspicious objects
* Multiple-person presence

---

# ⚠️ Important Design Principle

HireMind does **not** immediately label a candidate as a cheater because of a single event.

For example:

```text
Candidate looks away
        ↓
NOT automatically cheating
```

Instead:

```text
Event
  ↓
Severity
  ↓
Frequency
  ↓
Duration
  ↓
Context
  ↓
Overall Integrity Score
```

This reduces false accusations and supports HireMind's evidence-based hiring philosophy.

---

# 📊 4. Assessment Integrity Score

Every candidate receives an assessment integrity score.

Example:

```text
Integrity Score: 94 / 100

Risk Level: LOW
```

Possible classification:

```text
90 – 100   → LOW RISK
70 – 89    → MEDIUM RISK
0 – 69     → HIGH RISK
```

The exact scoring thresholds can be configured according to the recruitment organization's requirements.

---

# 📋 5. Proctoring Event Model

Each suspicious event can be stored independently.

Example:

```json
{
  "candidateId": "candidate_1024",
  "assessmentId": "assessment_2026",
  "eventType": "TAB_SWITCH",
  "severity": "MEDIUM",
  "timestamp": "2026-08-15T10:42:31Z",
  "questionNumber": 18,
  "duration": 3
}
```

This allows recruiters to understand **why** a candidate received a particular integrity score.

---

# 🧮 6. Assessment Evaluation

After submission, the Assessment Evaluation Engine calculates:

### Overall Performance

```text
Total Questions       30
Correct Answers       26
Incorrect Answers      4

Score                 26 / 30
Percentage            86.7%
```

### Skill-wise Performance

Example:

```text
Python              █████████░ 90%
Machine Learning    ████████░░ 85%
SQL                 ███████░░░ 70%
Problem Solving     ██████████ 95%
```

Because questions contain skill and topic metadata, HireMind can identify the candidate's strengths and weaknesses rather than providing only a final score.

---

# 🧠 7. Assessment Intelligence

The assessment result can be combined with the candidate intelligence generated by HireMind's existing AI agents.

```text
┌──────────────────────────────┐
│ Candidate Intelligence       │
│                              │
│ Resume Analysis              │
│ Role Match                   │
│ Evidence Verification        │
│ Hidden Skills                │
│ Project Authenticity          │
│ Technical Depth              │
└──────────────┬───────────────┘
               │
               ▼
        Candidate Profile
               │
               +
               │
┌──────────────▼───────────────┐
│ Assessment Intelligence      │
│                              │
│ Technical Score              │
│ Skill Performance            │
│ Assessment Integrity         │
│ Proctoring Events            │
└──────────────┬───────────────┘
               │
               ▼
        Final Candidate Score
               │
               ▼
       Recruiter Intelligence
```

---

# 🏆 8. Final Candidate Evaluation

HireMind keeps different evaluation dimensions separate.

Example:

```text
Profile Intelligence       82/100
Technical Assessment       87/100
Assessment Integrity       94/100
────────────────────────────────
Overall Candidate Score    86/100
```

This allows recruiters to understand the complete candidate rather than relying on one score.

---

# 📑 9. Recruiter Assessment Report

Recruiters receive a detailed report containing:

### Candidate Information

* Candidate name
* Applied role
* Assessment name
* Assessment date
* Completion status

### Assessment Performance

* Total score
* Percentage
* Correct answers
* Incorrect answers
* Time taken
* Skill-wise performance
* Difficulty-wise performance

### Proctoring

* Integrity score
* Risk level
* Number of suspicious events
* Event types
* Event timestamps
* Event duration

### Hiring Insights

* Technical strengths
* Technical weaknesses
* Assessment performance
* Assessment integrity
* Overall recommendation

---

# 🔐 10. Security & Integrity Principles

HireMind follows a layered approach to assessment integrity.

### Principle 1 — Evidence over assumptions

A single suspicious event should not automatically result in rejection.

### Principle 2 — Transparent monitoring

Candidates should be informed about the monitoring mechanisms before starting the assessment.

### Principle 3 — Explainable results

Recruiters should be able to understand the events contributing to an integrity score.

### Principle 4 — Separate performance from integrity

A candidate's technical score and proctoring score should remain separate.

### Principle 5 — Human decision remains important

AI-generated assessment insights should support recruiter decision-making rather than blindly replacing human judgment.

---

# 🏛️ System Architecture

```text
                         ┌──────────────────────┐
                         │    Candidate Portal  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Assessment Interface │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
       ┌────────────────────┐              ┌────────────────────┐
       │ Assessment Engine  │              │ Proctoring Engine  │
       ├────────────────────┤              ├────────────────────┤
       │ Questions          │              │ Face Monitoring    │
       │ Timer              │              │ Multiple Faces     │
       │ Answers            │              │ Tab Switching      │
       │ Navigation         │              │ Fullscreen         │
       │ Submission         │              │ Object Detection   │
       └─────────┬──────────┘              └─────────┬──────────┘
                 │                                   │
                 └────────────────┬──────────────────┘
                                  ▼
                       ┌─────────────────────┐
                       │ Evaluation Engine   │
                       ├─────────────────────┤
                       │ Score Calculation   │
                       │ Skill Analysis      │
                       │ Integrity Analysis  │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ Assessment Report   │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ Candidate Ranking   │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ Recruiter Dashboard  │
                       └─────────────────────┘
```

---

# 🗄️ Core Data Model

A simplified data structure can contain:

```text
Users
 ├── Candidates
 └── Recruiters

Jobs
 └── Job Descriptions

Applications
 ├── Candidate
 ├── Job
 └── Application Status

Assessments
 ├── Job
 ├── Questions
 ├── Duration
 └── Configuration

Questions
 ├── Assessment
 ├── Question
 ├── Options
 ├── Answer
 ├── Difficulty
 └── Skill

Assessment Attempts
 ├── Candidate
 ├── Assessment
 ├── Start Time
 ├── End Time
 ├── Score
 └── Status

Answers
 ├── Attempt
 ├── Question
 └── Selected Answer

Proctoring Events
 ├── Attempt
 ├── Event Type
 ├── Severity
 ├── Timestamp
 └── Evidence

Assessment Reports
 ├── Attempt
 ├── Performance
 ├── Skill Analysis
 └── Integrity Analysis
```

---

# 🔄 Complete Assessment Lifecycle

```text
1. Recruiter creates job
          ↓
2. Job description analyzed
          ↓
3. Assessment automatically generated
          ↓
4. Assessment stored in question bank
          ↓
5. Candidate applies
          ↓
6. HireMind AI agents analyze candidate
          ↓
7. Candidate reaches shortlist threshold
          ↓
8. Assessment invitation sent
          ↓
9. Candidate performs system check
          ↓
10. Candidate starts assessment
          ↓
11. Questions + timer activated
          ↓
12. AI proctoring begins
          ↓
13. Candidate answers questions
          ↓
14. Proctoring events recorded
          ↓
15. Candidate submits assessment
          ↓
16. Automatic evaluation
          ↓
17. Skill-wise analysis
          ↓
18. Integrity analysis
          ↓
19. Assessment report generated
          ↓
20. Candidate ranking updated
          ↓
21. Recruiter receives intelligence report
          ↓
22. Hiring decision
```

---

# ⚙️ Technology Architecture

The HireMind platform is designed around a modern web and AI architecture.

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Component-based UI

### Backend

* API-driven application architecture
* Server-side assessment processing
* Authentication and authorization
* Assessment session management

### Database

* PostgreSQL
* Structured candidate and assessment data
* Assessment attempts
* Answers
* Proctoring events
* Recruiter reports

### AI Layer

* LLM-based assessment generation
* Multi-agent candidate intelligence
* Automated assessment analysis
* Skill analysis
* Evidence-based candidate evaluation

### Computer Vision

The proctoring layer can use browser camera access and computer-vision models for:

* Face detection
* Multiple-face detection
* Object detection
* Candidate presence monitoring

---

# 📁 Suggested Project Structure

```text
hiremind/
│
├── app/
│   ├── candidate/
│   │   ├── assessment/
│   │   └── result/
│   │
│   ├── recruiter/
│   │   ├── assessments/
│   │   └── reports/
│   │
│   └── api/
│       ├── assessments/
│       ├── attempts/
│       ├── answers/
│       └── proctoring/
│
├── components/
│   ├── assessment/
│   ├── proctoring/
│   ├── recruiter/
│   └── ui/
│
├── agents/
│   ├── resume-parser/
│   ├── role-match/
│   ├── evidence-verification/
│   ├── hidden-skills/
│   ├── authenticity/
│   ├── technical-depth/
│   └── ranking/
│
├── lib/
│   ├── assessment/
│   ├── proctoring/
│   ├── scoring/
│   └── ai/
│
├── database/
│   └── schema/
│
├── public/
│
└── README.md
```

---

# 📊 Example Assessment Result

```text
╔════════════════════════════════════════════╗
║             HIREMIND ASSESSMENT            ║
╠════════════════════════════════════════════╣
║ Candidate: Candidate 1024                  ║
║ Role: AI/ML Engineer                       ║
╠════════════════════════════════════════════╣
║                                            ║
║ Assessment Score           26 / 30         ║
║ Percentage                 86.7%            ║
║ Time Taken                 24m 12s          ║
║                                            ║
║ Integrity Score            94 / 100        ║
║ Risk Level                 LOW              ║
║                                            ║
║ Python                     90%              ║
║ Machine Learning           85%              ║
║ SQL                        70%              ║
║ Problem Solving            95%              ║
║                                            ║
║ Recommendation             STRONG MATCH    ║
╚════════════════════════════════════════════╝
```

---

# 🌟 Key Advantages

### For Recruiters

* Reduces manual assessment evaluation
* Provides standardized candidate testing
* Identifies technical strengths and weaknesses
* Provides assessment integrity insights
* Enables evidence-backed candidate comparison
* Integrates with AI-powered candidate ranking

### For Candidates

* Role-specific assessments
* Transparent evaluation
* Skill-wise feedback
* Clearer application journey
* Better understanding of strengths and weaknesses

### For Organizations

* Scalable candidate evaluation
* Consistent assessments
* Reduced recruiter workload
* Better talent discovery
* More structured hiring decisions

---

# 🧪 Testing Strategy

The assessment system should be tested across multiple layers.

### Unit Testing

Test:

* Score calculation
* Timer logic
* Answer validation
* Integrity scoring
* Event classification

### Integration Testing

Test:

```text
Job
 ↓
Assessment Generation
 ↓
Assessment Storage
 ↓
Candidate Attempt
 ↓
Evaluation
 ↓
Report
```

### Proctoring Testing

Test:

* Camera unavailable
* Camera permission denied
* Face disappears
* Multiple faces
* Tab switching
* Fullscreen exit
* Network interruption
* Browser refresh
* Assessment timeout

### End-to-End Testing

Test the complete journey:

```text
Recruiter
   ↓
Create Job
   ↓
Assessment Generated
   ↓
Candidate Shortlisted
   ↓
Assessment Invitation
   ↓
Candidate Test
   ↓
Proctoring
   ↓
Evaluation
   ↓
Recruiter Report
```

---

# 🛣️ Future Roadmap

The HireMind assessment system can evolve into a more intelligent evaluation platform.

### Phase 1 — Core Assessment

* [x] AI-generated assessments
* [x] Question bank
* [x] Candidate assessment
* [x] Automatic scoring

### Phase 2 — AI Proctoring

* [ ] Face detection
* [ ] Multiple-person detection
* [ ] Tab monitoring
* [ ] Fullscreen monitoring
* [ ] Suspicious-event logging
* [ ] Integrity scoring

### Phase 3 — Assessment Intelligence

* [ ] Skill-wise analysis
* [ ] Difficulty-wise analysis
* [ ] Candidate performance insights
* [ ] Automated assessment reports

### Phase 4 — Advanced Intelligence

* [ ] Adaptive assessments
* [ ] Dynamic difficulty
* [ ] Behavioral pattern analysis
* [ ] Predictive assessment analytics
* [ ] Recruiter feedback loop

The original HireMind roadmap also identifies adaptive assessments, predictive hiring analytics, and continuous learning from recruiter feedback and assessment outcomes as future capabilities.

---

# 🔮 Future Vision

HireMind aims to move beyond:

> **"Does this candidate's resume match the job?"**

towards:

> **"What can this candidate actually demonstrate, what evidence supports their capabilities, and how confidently can we evaluate their fit for the role?"**

The long-term vision is a continuous talent intelligence platform where candidate profiles, assessments, verified skills, hiring outcomes, and recruiter feedback continuously improve the recruitment process.

---

# 🤝 HireMind Philosophy

```text
                    HIREMIND
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Evidence       Intelligence   Transparency
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
              Better Hiring Decisions
```

HireMind is built around three principles:

### 🧠 Intelligence

Use AI to understand candidates beyond keywords.

### 🔎 Evidence

Support candidate evaluation with observable evidence and assessment performance.

### 🤝 Transparency

Provide recruiters and candidates with clearer insights into the hiring process.

---

# 📜 Project Context

HireMind was designed as an AI-native recruitment intelligence solution that enhances existing hiring workflows through multi-agent candidate evaluation, evidence verification, hidden-skill discovery, automated assessments, candidate ranking, and recruiter intelligence.

The assessment and proctoring layer extends this architecture by adding a structured mechanism to evaluate what candidates can demonstrate during the hiring process.

---

# 👨‍💻 Project

**Project:** HireMind
**Module:** AI Assessment & Proctoring
**Track:** AI Systems & Workflow Innovation Challenge

### Built for intelligent, evidence-based recruitment.

---

## ⭐ If you find this project interesting

Give the project a ⭐ and follow its development as HireMind evolves into a complete AI-powered recruitment intelligence platform.

---

**HireMind — From Resume Screening to Intelligent Talent Evaluation.**
