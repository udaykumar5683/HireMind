import React from 'react';

export function LandingPage({ onGetStarted }) {
  const scrollToHowItWorks = (e) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Background ambient glow effects */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          {/* Left Column: Text & CTAs */}
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-pulse"></span>
              <i className="ti ti-sparkles"></i>
              <span>Next-Gen AI Career Intelligence</span>
            </div>

            <h1 className="hero-title">
              Your AI Career <br />
              <span className="hero-title-gradient">Intelligence Platform</span>
            </h1>

            <p className="hero-subtitle">
              Turn your resume into a personalized career strategy.
            </p>

            <p className="hero-description">
              HireMind analyzes your resume, skills, projects, professional profiles and technical evidence to help you understand your strengths, identify skill gaps and discover career opportunities.
            </p>

            <div className="hero-cta-group">
              <button className="btn-primary-hero" onClick={onGetStarted}>
                <span>Get Started</span>
                <i className="ti ti-arrow-right"></i>
              </button>
              <button className="btn-secondary-hero" onClick={scrollToHowItWorks}>
                <i className="ti ti-player-play"></i>
                <span>See How It Works</span>
              </button>
            </div>

            <div className="hero-trust-badges">
              <div className="trust-item">
                <i className="ti ti-shield-check text-purple"></i>
                <span>Multi-Agent AI Engine</span>
              </div>
              <div className="trust-item">
                <i className="ti ti-brand-github text-purple"></i>
                <span>Evidence-Backed Verification</span>
              </div>
              <div className="trust-item">
                <i className="ti ti-lock text-purple"></i>
                <span>Privacy First</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Dashboard Mockup */}
          <div className="hero-visual">
            <div className="dashboard-preview-card">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="mockup-title">
                  <i className="ti ti-shield-code"></i> HireMind Analysis Summary
                </div>
                <div className="mockup-live-badge">
                  <span className="live-dot"></span> Verified
                </div>
              </div>

              <div className="mockup-body">
                {/* Candidate Info Header */}
                <div className="mockup-user-info">
                  <div className="mockup-avatar">
                    <i className="ti ti-user-check"></i>
                  </div>
                  <div>
                    <h4 className="mockup-user-name">Alex Morgan</h4>
                    <p className="mockup-user-role">Full Stack & AI Engineer Candidate</p>
                  </div>
                </div>

                {/* Score Grid */}
                <div className="mockup-scores-grid">
                  <div className="score-card">
                    <div className="score-header">
                      <span className="score-label">Resume Score</span>
                      <i className="ti ti-file-certificate score-icon"></i>
                    </div>
                    <div className="score-value text-emerald">82%</div>
                    <div className="score-bar-bg">
                      <div className="score-bar-fill bg-emerald" style={{ width: '82%' }}></div>
                    </div>
                  </div>

                  <div className="score-card">
                    <div className="score-header">
                      <span className="score-label">Skill Match</span>
                      <i className="ti ti-sparkles score-icon"></i>
                    </div>
                    <div className="score-value text-indigo">76%</div>
                    <div className="score-bar-bg">
                      <div className="score-bar-fill bg-indigo" style={{ width: '76%' }}></div>
                    </div>
                  </div>

                  <div className="score-card">
                    <div className="score-header">
                      <span className="score-label">Career Readiness</span>
                      <i className="ti ti-trending-up score-icon"></i>
                    </div>
                    <div className="score-value text-purple">71%</div>
                    <div className="score-bar-bg">
                      <div className="score-bar-fill bg-purple" style={{ width: '71%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Recommended Roles */}
                <div className="mockup-roles-section">
                  <div className="roles-section-header">
                    <i className="ti ti-target"></i>
                    <span>Top Recommended Roles</span>
                  </div>
                  <div className="mockup-roles-list">
                    <div className="role-row">
                      <div className="role-info">
                        <span className="role-title">AI Engineer</span>
                        <span className="role-tag">High Fit</span>
                      </div>
                      <div className="role-match-badge match-high">87% Match</div>
                    </div>
                    <div className="role-row">
                      <div className="role-info">
                        <span className="role-title">ML Engineer</span>
                        <span className="role-tag">Strong Fit</span>
                      </div>
                      <div className="role-match-badge match-medium">82% Match</div>
                    </div>
                  </div>
                </div>

                {/* Verification Indicators */}
                <div className="mockup-evidence-footer">
                  <div className="evidence-badge">
                    <i className="ti ti-circle-check-filled text-emerald"></i>
                    <span>GitHub Code Evidence Verified</span>
                  </div>
                  <div className="evidence-badge">
                    <i className="ti ti-shield-check-filled text-indigo"></i>
                    <span>Multi-Agent Authenticity Score: 88/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Capabilities</span>
            <h2 className="section-title">Comprehensive Career Intelligence</h2>
            <p className="section-description">
              Four core pillars of our AI-driven assessment engine designed to elevate your professional profile.
            </p>
          </div>

          <div className="features-grid">
            {/* Card 1 */}
            <div className="feature-card">
              <div className="feature-icon-box icon-purple">
                <i className="ti ti-file-text"></i>
              </div>
              <h3 className="feature-title">Resume Intelligence</h3>
              <p className="feature-description">
                Extract and analyze the important information from your resume with structural precision.
              </p>
            </div>

            {/* Card 2 */}
            <div className="feature-card">
              <div className="feature-icon-box icon-indigo">
                <i className="ti ti-sparkles"></i>
              </div>
              <h3 className="feature-title">Hidden Skill Discovery</h3>
              <p className="feature-description">
                Identify skills and capabilities that may not be explicitly listed on your resume through project evidence.
              </p>
            </div>

            {/* Card 3 */}
            <div className="feature-card">
              <div className="feature-icon-box icon-emerald">
                <i className="ti ti-target"></i>
              </div>
              <h3 className="feature-title">Career Matching</h3>
              <p className="feature-description">
                Discover career roles that align with your skills, experience and verified technical evidence.
              </p>
            </div>

            {/* Card 4 */}
            <div className="feature-card">
              <div className="feature-icon-box icon-amber">
                <i className="ti ti-cpu"></i>
              </div>
              <h3 className="feature-title">Technical Assessment</h3>
              <p className="feature-description">
                Evaluate your technical depth and identify key areas for continuous skill improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Process</span>
            <h2 className="section-title">How HireMind Works</h2>
            <p className="section-description">
              A simple 4-step workflow from resume upload to career intelligence.
            </p>
          </div>

          <div className="workflow-steps-grid">
            {/* Step 01 */}
            <div className="workflow-step-card">
              <div className="step-number">01</div>
              <div className="step-icon-wrap">
                <i className="ti ti-upload"></i>
              </div>
              <h4 className="step-title">Upload</h4>
              <p className="step-description">
                Upload your resume and provide your professional profile links.
              </p>
            </div>

            <div className="workflow-connector">
              <i className="ti ti-chevron-right"></i>
            </div>

            {/* Step 02 */}
            <div className="workflow-step-card">
              <div className="step-number">02</div>
              <div className="step-icon-wrap">
                <i className="ti ti-brain"></i>
              </div>
              <h4 className="step-title">Analyze</h4>
              <p className="step-description">
                HireMind's AI agents analyze your career information.
              </p>
            </div>

            <div className="workflow-connector">
              <i className="ti ti-chevron-right"></i>
            </div>

            {/* Step 03 */}
            <div className="workflow-step-card">
              <div className="step-number">03</div>
              <div className="step-icon-wrap">
                <i className="ti ti-search"></i>
              </div>
              <h4 className="step-title">Discover</h4>
              <p className="step-description">
                Identify skills, career matches, gaps and technical strengths.
              </p>
            </div>

            <div className="workflow-connector">
              <i className="ti ti-chevron-right"></i>
            </div>

            {/* Step 04 */}
            <div className="workflow-step-card">
              <div className="step-number">04</div>
              <div className="step-icon-wrap">
                <i className="ti ti-trending-up"></i>
              </div>
              <h4 className="step-title">Grow</h4>
              <p className="step-description">
                Get a personalized career intelligence profile and roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Multi-Agent Pipeline Section */}
      <section className="ai-pipeline-section" id="ai-pipeline">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">AI Pipeline</span>
            <h2 className="section-title">Multi-Agent AI Engine</h2>
            <p className="section-description">
              6 specialized AI agents working together in sequence to analyze, correlate, verify, and match your candidate profile.
            </p>
          </div>

          <div className="agent-pipeline-flow">
            <div className="agent-flow-node">
              <div className="node-badge">Agent 1</div>
              <div className="node-icon"><i className="ti ti-file-text"></i></div>
              <h4 className="node-title">Resume Intelligence</h4>
              <p className="node-desc">Structural parsing and data extraction</p>
            </div>

            <div className="agent-flow-arrow"><i className="ti ti-arrow-right"></i></div>

            <div className="agent-flow-node">
              <div className="node-badge">Agent 2</div>
              <div className="node-icon"><i className="ti ti-shield-check"></i></div>
              <h4 className="node-title">Evidence Verification</h4>
              <p className="node-desc">Cross-source GitHub & profile correlation</p>
            </div>

            <div className="agent-flow-arrow"><i className="ti ti-arrow-right"></i></div>

            <div className="agent-flow-node">
              <div className="node-badge">Agent 3</div>
              <div className="node-icon"><i className="ti ti-sparkles"></i></div>
              <h4 className="node-title">Hidden Skill Discovery</h4>
              <p className="node-desc">Implicit capability & strength detection</p>
            </div>

            <div className="agent-flow-arrow"><i className="ti ti-arrow-right"></i></div>

            <div className="agent-flow-node">
              <div className="node-badge">Agent 4</div>
              <div className="node-icon"><i className="ti ti-target"></i></div>
              <h4 className="node-title">Career Role Matching</h4>
              <p className="node-desc">LLM-based job fit & role ranking</p>
            </div>

            <div className="agent-flow-arrow"><i className="ti ti-arrow-right"></i></div>

            <div className="agent-flow-node">
              <div className="node-badge">Agent 5</div>
              <div className="node-icon"><i className="ti ti-checkbox"></i></div>
              <h4 className="node-title">Project Authenticity</h4>
              <p className="node-desc">Cross-agent truth checking & verification</p>
            </div>

            <div className="agent-flow-arrow"><i className="ti ti-arrow-right"></i></div>

            <div className="agent-flow-node">
              <div className="node-badge">Agent 6</div>
              <div className="node-icon"><i className="ti ti-cpu"></i></div>
              <h4 className="node-title">Technical Depth Assessment</h4>
              <p className="node-desc">Real problem solving & interview readiness</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <h2 className="cta-title">Ready to unlock your AI career strategy?</h2>
          <p className="cta-subtitle">
            Upload your resume and let HireMind's multi-agent AI engine generate your complete career intelligence report in seconds.
          </p>
          <button className="btn-primary-hero btn-cta-large" onClick={onGetStarted}>
            <span>Get Started Now</span>
            <i className="ti ti-arrow-right"></i>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="hiremind-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="navbar-brand">
              <div className="brand-icon-wrap">
                <i className="ti ti-brain"></i>
              </div>
              <span className="brand-name">HireMind</span>
            </div>
            <p className="footer-tagline">AI Career Intelligence Platform</p>
          </div>

          <div className="footer-links">
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a>
            <a href="#how-it-works" onClick={scrollToHowItWorks}>How It Works</a>
            <a href="#ai-pipeline" onClick={(e) => { e.preventDefault(); document.getElementById('ai-pipeline')?.scrollIntoView({ behavior: 'smooth' }); }}>AI Engine</a>
            <button className="footer-cta-link" onClick={onGetStarted}>Get Started</button>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} HireMind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
