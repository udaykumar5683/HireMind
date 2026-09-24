import React from 'react';

export function Navbar({ currentView, onNavigate, onGetStarted }) {
  const scrollToSection = (id) => {
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="hiremind-navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => onNavigate('landing')}>
          <div className="brand-icon-wrap">
            <i className="ti ti-brain"></i>
          </div>
          <span className="brand-name">HireMind</span>
          <span className="brand-badge">AI</span>
        </div>

        {/* Navigation Links */}
        <div className="navbar-links">
          <button 
            className={`nav-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => {
              onNavigate('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Home
          </button>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('how-it-works')}
          >
            How It Works
          </button>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('features')}
          >
            Features
          </button>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('ai-pipeline')}
          >
            AI Agents
          </button>
        </div>

        {/* Action Button */}
        <div className="navbar-actions">
          {currentView === 'parser' ? (
            <button className="nav-back-btn" onClick={() => onNavigate('landing')}>
              <i className="ti ti-arrow-left"></i> Home
            </button>
          ) : (
            <button className="nav-cta-btn" onClick={onGetStarted}>
              Get Started <i className="ti ti-arrow-right"></i>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
