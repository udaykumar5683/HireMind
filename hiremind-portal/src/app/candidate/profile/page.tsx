"use client";

import { useState, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Github,
  Linkedin,
  FileText,
  Download,
  Edit3,
  X,
  Plus,
  Camera
} from "lucide-react";

// Mock data for the candidate profile
const initialData = {
  fullName: "Uday Kumar",
  jobTitle: "AI/ML Engineer | Deep Learning & Computer Vision Specialist",
  location: "San Francisco, CA",
  about: "Passionate AI/ML engineer with 3+ years of experience in computer vision and deep learning. Specializing in building scalable computer vision systems and deploying them to production. Skilled in Python, TensorFlow, PyTorch, and cloud technologies (AWS, GCP).",
  contact: {
    email: "uday.kumar@email.com",
    phone: "+1 (555) 123-4567",
    github: "github.com/uday-kumar",
    linkedin: "linkedin.com/in/uday-kumar"
  },
  skills: ["Python", "TensorFlow", "PyTorch", "Computer Vision", "SQL", "AWS"],
  experience: [
    {
      id: 1,
      role: "Machine Learning Intern",
      company: "TechVision AI",
      startDate: "Jan 2026",
      endDate: "Present"
    },
    {
      id: 2,
      role: "Software Engineering Intern",
      company: "DataFlow Inc.",
      startDate: "Jun 2025",
      endDate: "Aug 2025"
    }
  ],
  education: [
    {
      id: 1,
      school: "University of California, Berkeley",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startDate: "2022",
      endDate: "2026"
    }
  ],
  resume: {
    name: "Uday_Kumar_Resume.pdf",
    uploadDate: "June 15, 2026"
  },
  avatarUrl: null as string | null
};

export default function CandidateProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(initialData);
  const [tempData, setTempData] = useState(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setTempData(prev => ({ ...prev, avatarUrl: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = () => {
    setTempData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempData(profileData);
    setIsEditing(false);
  };

  const handleSave = () => {
    setProfileData(tempData);
    setIsEditing(false);
  };

  const handleAddSkill = (skill: string) => {
    if (skill.trim() && !tempData.skills.includes(skill.trim())) {
      setTempData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setTempData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-hm-bg-cream">
      {/* Cover Banner */}
      <div className="w-full h-56 md:h-72 rounded-b-3xl relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2070"
          alt="Modern office background"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark overlay for visual depth */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-20 md:-mt-28 pb-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6 items-end mb-8">
          {/* Avatar */}
          <div className="relative">
            <div
              onClick={handleAvatarClick}
              className={`w-36 h-36 md:w-44 md:h-44 rounded-2xl border-4 border-white shadow-xl bg-hm-indigo-soft flex items-center justify-center overflow-hidden ${isEditing ? "cursor-pointer hover:opacity-90" : ""}`}
            >
              {tempData.avatarUrl ? (
                <img
                  src={tempData.avatarUrl}
                  alt={tempData.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl md:text-6xl font-bold text-hm-indigo">
                  {getInitials(tempData.fullName)}
                </span>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name, Title, Location & Edit Button */}
          <div className="flex-1 w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              {isEditing ? (
                <input
                  type="text"
                  value={tempData.fullName}
                  onChange={(e) => setTempData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="text-3xl md:text-4xl font-bold text-hm-text-near-black bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo w-full"
                />
              ) : (
                <h1 className="text-3xl md:text-4xl font-bold text-hm-text-near-black">{tempData.fullName}</h1>
              )}
              {isEditing ? (
                <input
                  type="text"
                  value={tempData.jobTitle}
                  onChange={(e) => setTempData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  className="text-lg md:text-xl text-hm-text-muted bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo w-full"
                />
              ) : (
                <p className="text-lg md:text-xl text-hm-text-muted">{tempData.jobTitle}</p>
              )}
              {isEditing ? (
                <input
                  type="text"
                  value={tempData.location}
                  onChange={(e) => setTempData(prev => ({ ...prev, location: e.target.value }))}
                  className="text-hm-text-faint flex items-center gap-2 bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo w-full"
                />
              ) : (
                <p className="text-hm-text-faint flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {tempData.location}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-6 py-2 rounded-full border border-hm-indigo text-hm-indigo hover:bg-hm-indigo-soft transition-colors flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 rounded-full border border-hm-text-faint text-hm-text-muted hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-full bg-hm-terracotta text-white hover:opacity-90 transition-colors"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* About Section */}
          <section className="bg-white rounded-2xl border border-hm-card-border p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-hm-indigo" />
              <h2 className="text-2xl font-bold text-hm-text-near-black">About</h2>
            </div>
            {isEditing ? (
              <textarea
                value={tempData.about}
                onChange={(e) => setTempData(prev => ({ ...prev, about: e.target.value }))}
                className="w-full text-hm-text-muted bg-transparent border border-hm-card-border rounded-xl p-3 focus:outline-none focus:border-hm-indigo resize-none"
                rows={4}
              />
            ) : (
              <p className="text-hm-text-muted leading-relaxed">{tempData.about}</p>
            )}
          </section>

          {/* Contact Section */}
          <section className="bg-white rounded-2xl border border-hm-card-border p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-hm-indigo" />
              <h2 className="text-2xl font-bold text-hm-text-near-black">Contact</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-hm-text-muted" />
                {isEditing ? (
                  <input
                    type="email"
                    value={tempData.contact.email}
                    onChange={(e) => setTempData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, email: e.target.value }
                    }))}
                    className="text-hm-text-near-black bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo flex-1"
                  />
                ) : (
                  <a href={`mailto:${tempData.contact.email}`} className="text-hm-text-near-black hover:text-hm-indigo">
                    {tempData.contact.email}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-hm-text-muted" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={tempData.contact.phone}
                    onChange={(e) => setTempData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, phone: e.target.value }
                    }))}
                    className="text-hm-text-near-black bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo flex-1"
                  />
                ) : (
                  <a href={`tel:${tempData.contact.phone}`} className="text-hm-text-near-black hover:text-hm-indigo">
                    {tempData.contact.phone}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Github className="w-5 h-5 text-hm-text-muted" />
                {isEditing ? (
                  <input
                    type="text"
                    value={tempData.contact.github}
                    onChange={(e) => setTempData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, github: e.target.value }
                    }))}
                    className="text-hm-text-near-black bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo flex-1"
                  />
                ) : (
                  <a
                    href={`https://${tempData.contact.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hm-text-near-black hover:text-hm-indigo"
                  >
                    {tempData.contact.github}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Linkedin className="w-5 h-5 text-hm-text-muted" />
                {isEditing ? (
                  <input
                    type="text"
                    value={tempData.contact.linkedin}
                    onChange={(e) => setTempData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, linkedin: e.target.value }
                    }))}
                    className="text-hm-text-near-black bg-transparent border-b border-hm-card-border focus:outline-none focus:border-hm-indigo flex-1"
                  />
                ) : (
                  <a
                    href={`https://${tempData.contact.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hm-text-near-black hover:text-hm-indigo"
                  >
                    {tempData.contact.linkedin}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Skills Section */}
          <section className="bg-white rounded-2xl border border-hm-card-border p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-hm-indigo" />
              <h2 className="text-2xl font-bold text-hm-text-near-black">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {tempData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hm-indigo-soft text-hm-indigo font-medium"
                >
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-hm-terracotta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <button
                  onClick={() => {
                    const newSkill = prompt("Add a new skill:");
                    if (newSkill) handleAddSkill(newSkill);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-hm-card-border text-hm-text-muted hover:border-hm-indigo hover:text-hm-indigo transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Skill
                </button>
              )}
            </div>
          </section>

          {/* Experience Section */}
          <section className="bg-white rounded-2xl border border-hm-card-border p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-hm-indigo" />
              <h2 className="text-2xl font-bold text-hm-text-near-black">Experience</h2>
            </div>
            <div className="space-y-6">
              {tempData.experience.map((exp) => (
                <div key={exp.id} className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-hm-text-near-black">{exp.role}</h3>
                    <p className="text-hm-text-muted">{exp.company}</p>
                  </div>
                  <p className="text-hm-text-faint whitespace-nowrap">
                    {exp.startDate} - {exp.endDate}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Education Section */}
          <section className="bg-white rounded-2xl border border-hm-card-border p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-hm-indigo" />
              <h2 className="text-2xl font-bold text-hm-text-near-black">Education</h2>
            </div>
            <div className="space-y-6">
              {tempData.education.map((edu) => (
                <div key={edu.id} className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-hm-text-near-black">{edu.school}</h3>
                    <p className="text-hm-text-muted">{edu.degree}, {edu.field}</p>
                  </div>
                  <p className="text-hm-text-faint whitespace-nowrap">
                    {edu.startDate} - {edu.endDate}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Resume Section */}
          <section className="bg-hm-sage-soft rounded-2xl border border-hm-card-border p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-hm-sage" />
              <h2 className="text-2xl font-bold text-hm-text-near-black">Resume</h2>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <FileText className="w-6 h-6 text-hm-sage" />
                </div>
                <div>
                  <p className="font-medium text-hm-text-near-black">{tempData.resume.name}</p>
                  <p className="text-hm-text-faint text-sm">Uploaded {tempData.resume.uploadDate}</p>
                </div>
              </div>
              {!isEditing ? (
                <button className="px-6 py-2 rounded-full bg-hm-sage text-white hover:opacity-90 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </button>
              ) : (
                <button className="px-6 py-2 rounded-full bg-hm-terracotta text-white hover:opacity-90 transition-colors">
                  Replace
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
