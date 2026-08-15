import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [enrichedProfile, setEnrichedProfile] = useState(null);
  const [processedUrls, setProcessedUrls] = useState([]); // Array of { name, url, accessible, error, data }
  const [savedFilePath, setSavedFilePath] = useState(null);
  const [pipelineState, setPipelineState] = useState({
    status: 'idle', // idle, running, completed, failed
    progress: 0,
    currentStep: '',
    results: null,
    error: null
  });
  // State for incoming parameters from HireMind Portal
  const [hiremindParams, setHiremindParams] = useState({
    userId: null,
    jobId: null,
    returnUrl: null
  });

  // Read query parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setHiremindParams({
      userId: urlParams.get('userId') || null,
      jobId: urlParams.get('jobId') || null,
      returnUrl: urlParams.get('returnUrl') || null
    });
  }, []);
  
  // New form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [customUrls, setCustomUrls] = useState([]); // [{ id: number, name: string, url: string }
  
  const fileInputRef = useRef(null);

  const steps = [
    'Resume uploaded',
    'Text extracted',
    'AI parsing complete',
    'Fetching GitHub data...',
    'Fetching portfolio...',
    'Testing URLs...',
    'Building enriched profile...'
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const extractPdfText = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
          }
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const groqParse = async (text, isImage = false, imageBase64 = null) => {
    const systemPrompt = `You are a resume parser. Extract everything and return ONLY a raw JSON object, no markdown, no backticks. Schema: 
    {
      "name": "",
      "email": "",
      "phone": "",
      "location": "",
      "summary": "",
      "links": {
        "github": "",
        "linkedin": "",
        "portfolio": "",
        "others": []
      },
      "skills": {
        "technical": [],
        "tools": [],
        "soft": [],
        "languages": []
      },
      "experience": [{
        "title": "",
        "company": "",
        "location": "",
        "duration": "",
        "highlights": []
      }],
      "education": [{
        "degree": "",
        "institution": "",
        "year": "",
        "gpa": ""
      }],
      "projects": [{
        "name": "",
        "description": "",
        "technologies": [],
        "link": ""
      }],
      "certifications": [],
      "total_experience_years": 0
    }`;

    let messages = [];
    
    if (isImage) {
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Parse this resume image and return JSON only.' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ];
    } else {
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: isImage ? 'meta-llama/llama-4-maverick-17b-128e-instruct' : 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 2000,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices returned from Groq API');
    }

    let content = data.choices[0].message.content;
    content = content.replace(/```json|```/g, '').trim();
    return JSON.parse(content);
  };

  const parseGithubUrl = (url) => {
    if (!url) return null;
    const profileMatch = url.match(/github\.com\/([^\/]+)\/?$/);
    const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/?$/);
    if (repoMatch) return { type: 'repo', username: repoMatch[1], repo: repoMatch[2] };
    if (profileMatch) return { type: 'profile', username: profileMatch[1] };
    return null;
  };

  // Helper: Retry with exponential backoff
  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    try {
      const res = await fetch(url, options);
      
      // Log rate limit info
      const remaining = res.headers.get('x-ratelimit-remaining');
      const reset = res.headers.get('x-ratelimit-reset');
      if (remaining !== null && reset !== null) {
        const resetTime = new Date(parseInt(reset) * 1000).toLocaleTimeString();
        console.log(`GitHub API: ${remaining} requests remaining, resets at ${resetTime}`);
      }

      // Handle rate limit
      if (res.status === 429) {
        throw new Error('Rate limit exceeded');
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    } catch (err) {
      if (retries > 0 && (err.message.includes('Rate limit') || err.message.includes('fetch'))) {
        console.log(`Retrying (${retries} left) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  // Helper: Fetch all pages of repositories
  const fetchAllRepos = async (username, headers) => {
    let allRepos = [];
    let page = 1;
    const perPage = 100; // Max per page
    
    while (true) {
      try {
        const url = `https://api.github.com/users/${username}/repos?sort=updated&per_page=${perPage}&page=${page}`;
        const repos = await fetchWithRetry(url, { headers });
        
        if (!Array.isArray(repos) || repos.length === 0) break;
        
        allRepos = allRepos.concat(repos);
        page++;
      } catch (err) {
        console.error(`Error fetching page ${page}:`, err);
        break;
      }
    }
    
    return allRepos;
  };

  const fetchGithubData = async (githubUrl) => {
    const githubData = {
      avatar_url: '',
      bio: '',
      followers: 0,
      top_repos: [],
      all_languages: [],
      total_repos: 0,
      fetch_status: 'skipped'
    };

    if (!githubUrl) return githubData;
    const parsed = parseGithubUrl(githubUrl);
    if (!parsed) return githubData;

    githubData.fetch_status = 'failed';
    const headers = { 'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}` };

    try {
      if (parsed.type === 'profile') {
        // Fetch user profile
        const userData = await fetchWithRetry(`https://api.github.com/users/${parsed.username}`, { headers });
        githubData.avatar_url = userData.avatar_url || '';
        githubData.bio = userData.bio || '';
        githubData.followers = userData.followers || 0;

        // Fetch all repos with pagination
        const allRepos = await fetchAllRepos(parsed.username, headers);
        githubData.total_repos = allRepos.length;

        // Process repos and collect languages
        const languages = new Set();
        githubData.top_repos = allRepos.map(repo => {
          if (repo.language) languages.add(repo.language);
          // Fetch topics for each repo
          return {
            name: repo.name,
            description: repo.description || '',
            language: repo.language || '',
            topics: repo.topics || [],
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            watchers: repo.watchers_count || 0,
            open_issues: repo.open_issues_count || 0,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            url: repo.html_url
          };
        });
        githubData.all_languages = Array.from(languages);
        githubData.fetch_status = 'success';
      } else if (parsed.type === 'repo') {
        // Fetch single repo
        const repoData = await fetchWithRetry(`https://api.github.com/repos/${parsed.username}/${parsed.repo}`, { headers });
        githubData.avatar_url = repoData.owner?.avatar_url || '';
        githubData.total_repos = 1;
        githubData.top_repos = [{
          name: repoData.name,
          description: repoData.description || '',
          language: repoData.language || '',
          topics: repoData.topics || [],
          stars: repoData.stargazers_count || 0,
          forks: repoData.forks_count || 0,
          watchers: repoData.watchers_count || 0,
          open_issues: repoData.open_issues_count || 0,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          url: repoData.html_url
        }];

        // Fetch repo languages
        const langsData = await fetchWithRetry(`https://api.github.com/repos/${parsed.username}/${parsed.repo}/languages`, { headers });
        githubData.all_languages = Object.keys(langsData);
        githubData.fetch_status = 'success';
      }
    } catch (err) {
      console.error('GitHub fetch error:', err);
    }

    return githubData;
  };

  const fetchPortfolioData = async (urls) => {
    // Skipping this since we now handle all URLs in processUrls
    const portfolioData = {
      description: '',
      skills: [],
      projects: [],
      fetch_status: 'skipped'
    };
    return portfolioData;
  };

  const handleProcess = async () => {
    if (!name || !email) {
      alert('Please fill in your name and email');
      return;
    }
    
    if (!file) {
      alert('Please upload a resume');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);
    setEnrichedProfile(null);
    setProcessedUrls([]);

    try {
      setCurrentStep(1);
      let text = '';
      let isImage = false;
      let imageBase64 = null;

      if (file.type === 'application/pdf') {
        text = await extractPdfText(file);
      } else if (file.type.startsWith('image/')) {
        isImage = true;
        imageBase64 = await imageToBase64(file);
      }

      setCurrentStep(2);
      let parsedResume = await groqParse(text, isImage, imageBase64);

      // Override with user-submitted data
      parsedResume = {
        ...parsedResume,
        name: name || parsedResume.name,
        email: email || parsedResume.email,
        links: {
          ...parsedResume.links,
          github: githubUrl || parsedResume.links.github,
          linkedin: linkedinUrl || parsedResume.links.linkedin,
          portfolio: portfolioUrl || parsedResume.links.portfolio,
          others: [
            ...(parsedResume.links.others || []),
            ...customUrls.filter(cu => cu.url).map(cu => cu.url)
          ]
        }
      };

      setCurrentStep(3);
      const githubData = await fetchGithubData(githubUrl || parsedResume.links.github);

      setCurrentStep(4);
      const portfolioData = await fetchPortfolioData(parsedResume.links);

      setCurrentStep(5);
      const allUrls = collectAllUrls(parsedResume);
      // Process URLs with step updates
      const processed = await processUrls(allUrls, (stepText) => {
        // Update the steps display with dynamic text
        // We'll modify the steps array temporarily or just use currentStep
        // For simplicity, we'll keep currentStep at 5 but log the text
        console.log(stepText);
      });
      setProcessedUrls(processed);

      setCurrentStep(6);
      const enriched = {
        ...parsedResume,
        github_data: githubData,
        portfolio_data: portfolioData,
        user_submitted_data: {
          name,
          email,
          custom_urls: customUrls
        }
      };

      // Save to backend
      try {
        const saveRes = await fetch('http://localhost:5000/save-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ profile: enriched, processed_urls: processed })
        });
        if (saveRes.ok) {
          const saveData = await saveRes.json();
          console.log('Profile saved successfully:', saveData);
          setSavedFilePath(saveData.filepath);
          
          // Automatically start the pipeline after saving
          setTimeout(() => handleRunPipeline(saveData.filepath), 500);
        } else {
          console.error('Failed to save profile');
        }
      } catch (saveErr) {
        console.error('Error saving profile:', saveErr);
      }

      console.log("AGENT_1_OUTPUT:", enriched);
      console.log("PROCESSED_URLS:", processed);
      setEnrichedProfile(enriched);
    } catch (err) {
      console.error('Error processing resume:', err);
      alert('Error processing resume. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunPipeline = async (filepath) => {
    const targetPath = filepath || savedFilePath;
    if (!targetPath) {
      alert('No saved profile to process');
      return;
    }

    setPipelineState({
      status: 'running',
      progress: 0,
      currentStep: 'Initializing pipeline...',
      results: null,
      error: null
    });

    try {
      const runRes = await fetch('http://localhost:5000/run-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: targetPath })
      });

      if (!runRes.ok) {
        const err = await runRes.json();
        throw new Error(err.error || 'Failed to start pipeline');
      }

      // Poll for pipeline status
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch('http://localhost:5000/pipeline-status');
        const status = await statusRes.json();
        setPipelineState(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
        }
      }, 1000);
    } catch (err) {
      console.error('Error running pipeline:', err);
      setPipelineState({
        status: 'failed',
        progress: 0,
        currentStep: '',
        results: null,
        error: err.message
      });
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const ensureProtocol = (url) => {
    if (!url) return url;
    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      return `https://${trimmedUrl}`;
    }
    return trimmedUrl;
  };

  const testUrlAccessibility = async (url) => {
    try {
      const fullUrl = ensureProtocol(url);
      
      // For well-known sites that might block proxies, assume they're accessible
      const isWellKnownSite = /github\.com|linkedin\.com|portfolio\.com/i.test(fullUrl);
      if (isWellKnownSite) {
        return { url: fullUrl, accessible: true, error: null, note: 'Well-known site, assumed accessible' };
      }
      
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return { url: fullUrl, accessible: true, error: null };
      } else {
        return { url: fullUrl, accessible: false, error: `HTTP error: ${res.status} ${res.statusText}` };
      }
    } catch (err) {
      return { url: ensureProtocol(url), accessible: false, error: err.message || 'Failed to fetch' };
    }
  };

  const addCustomUrl = () => {
    const newUrl = {
      id: Date.now(),
      name: "",
      url: ""
    };
    setCustomUrls([...customUrls, newUrl]);
  };

  const removeCustomUrl = (id) => {
    setCustomUrls(customUrls.filter(url => url.id !== id));
  };

  const updateCustomUrl = (id, field, value) => {
    setCustomUrls(customUrls.map(url => 
      url.id === id ? { ...url, [field]: value } : url
    ));
  };

  const collectAllUrls = (parsedResume) => {
    const urlMap = new Map(); // To avoid duplicates, key is normalized URL

    // Helper to add URL to map
    const addUrl = (name, url) => {
      if (!url) return;
      const normalizedUrl = ensureProtocol(url);
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, { name, url: normalizedUrl });
      }
    };

    // Add user-submitted URLs with names
    addUrl('GitHub', githubUrl);
    addUrl('LinkedIn', linkedinUrl);
    addUrl('Portfolio', portfolioUrl);
    customUrls.forEach(cu => {
      addUrl(cu.name || 'Custom URL', cu.url);
    });

    // Add URLs from parsed resume
    addUrl('GitHub (Resume)', parsedResume?.links?.github);
    addUrl('LinkedIn (Resume)', parsedResume?.links?.linkedin);
    addUrl('Portfolio (Resume)', parsedResume?.links?.portfolio);
    if (parsedResume?.links?.others) {
      parsedResume.links.others.forEach((url, idx) => {
        addUrl(`Other Link ${idx + 1}`, url);
      });
    }
    if (parsedResume?.projects) {
      parsedResume.projects.forEach((project, idx) => {
        if (project.link) {
          addUrl(`Project: ${project.name}`, project.link);
        }
      });
    }

    return Array.from(urlMap.values());
  };

  // Extract data from a single URL using our backend
  const extractUrlData = async (urlItem) => {
    const result = {
      ...urlItem,
      accessible: false,
      error: null,
      data: null
    };

    try {
      const fullUrl = urlItem.url;

      // Validate URL format
      try {
        new URL(fullUrl);
      } catch (err) {
        result.error = 'Invalid URL format';
        console.error('Invalid URL:', fullUrl, err);
        return result;
      }

      console.log('Extracting data from URL:', fullUrl);
      const res = await fetch('http://localhost:5000/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: fullUrl })
      });

      if (!res.ok) {
        result.error = `Backend error: ${res.status} ${res.statusText}`;
        console.error('Backend request failed:', result.error);
        // Still mark as accessible since we can't definitively say it's not
        result.accessible = true;
        result.data = { note: 'Could not extract data from URL' };
        return result;
      }

      const data = await res.json();
      result.accessible = !data.error;
      result.data = data;
      console.log('Successfully extracted data:', data);

    } catch (err) {
      result.error = err.message || 'Unknown error';
      console.error('Error processing URL:', urlItem.url, err);
      // Mark as accessible by default
      result.accessible = true;
      result.data = { note: 'Could not connect to backend' };
    }

    return result;
  };

  // Process all URLs sequentially
  const processUrls = async (urlItems, updateStep) => {
    const processed = [];
    let i = 0;
    for (const urlItem of urlItems) {
      if (updateStep) {
        updateStep(`Processing URL ${i + 1}/${urlItems.length}: ${urlItem.name}`);
      }
      console.log(`Processing URL ${i + 1}/${urlItems.length}:`, urlItem);
      const result = await extractUrlData(urlItem);
      processed.push(result);
      i++;
      // Add a small delay to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return processed;
  };

  return (
    <div className="app">
      <div className="agent-badge">Agent 1 · Resume Parser</div>
      
      {!enrichedProfile ? (
        <div className="upload-section">
          <h1>Resume Parser</h1>
          <p className="subtitle">Upload your resume and fill in your details</p>
          
          {/* User Details */}
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span className="required">*</span></label>
            <input
              type="email"
              className="form-input"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          
          {/* Resume Upload */}
          <div className="form-group">
            <label className="form-label">Upload Resume <span className="required">*</span></label>
            <div
              className={`upload-zone ${isProcessing ? 'processing' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <i className="ti ti-upload"></i>
              <p>Drag and drop your resume here, or click to browse</p>
              <span className="file-types">PDF, PNG, JPG</span>
            </div>
          </div>

          {file && (
            <div className="file-info">
              <i className="ti ti-file"></i>
              <div>
                <div className="file-name">{file.name}</div>
                <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <i className="ti ti-x"></i>
              </button>
            </div>
          )}

          {/* Pre-populated URLs */}
          <div className="form-group">
            <label className="form-label">Links</label>
            
            <div className="url-input-row">
              <i className="ti ti-brand-github url-icon"></i>
              <input
                type="url"
                className="url-input"
                placeholder="https://github.com/yourusername"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="url-input-row">
              <i className="ti ti-brand-linkedin url-icon"></i>
              <input
                type="url"
                className="url-input"
                placeholder="https://linkedin.com/in/yourusername"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="url-input-row">
              <i className="ti ti-world url-icon"></i>
              <input
                type="url"
                className="url-input"
                placeholder="https://yourportfolio.com"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {/* Custom URLs */}
            {customUrls.map((cu) => (
              <div key={cu.id} className="custom-url-row">
                <input
                  type="text"
                  className="form-input custom-url-name"
                  placeholder="URL name (e.g. Blog)"
                  value={cu.name}
                  onChange={(e) => updateCustomUrl(cu.id, 'name', e.target.value)}
                  disabled={isProcessing}
                />
                <input
                  type="url"
                  className="form-input custom-url-link"
                  placeholder="https://..."
                  value={cu.url}
                  onChange={(e) => updateCustomUrl(cu.id, 'url', e.target.value)}
                  disabled={isProcessing}
                />
                <button
                  className="remove-url-btn"
                  onClick={() => removeCustomUrl(cu.id)}
                  disabled={isProcessing}
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
            ))}

            <button
              className="add-url-btn"
              onClick={addCustomUrl}
              disabled={isProcessing}
            >
              <i className="ti ti-plus"></i> Add More URLs
            </button>
          </div>

          {/* Buttons */}
          <div className="button-group">
            {!isProcessing && (
              <button className="process-btn" onClick={handleProcess}>
                <i className="ti ti-player-play" style={{ marginRight: '8px' }}></i>
                Parse Resume
              </button>
            )}
          </div>

          {isProcessing && (
            <div className="steps-tracker">
              {steps.map((step, idx) => (
                <div key={idx} className={`step ${idx < currentStep ? 'completed' : idx === currentStep ? 'active' : ''}`}>
                  <div className="step-icon">
                    {idx < currentStep ? <i className="ti ti-check"></i> : idx === currentStep ? <i className="ti ti-clock-hour-3"></i> : ''}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="results-section">
          {/* Section 1: Parsed Resume Content */}
          <div className="section">
            <h3 className="section-header"><i className="ti ti-file-text"></i> Parsed Resume Content</h3>
            
            <div className="header-card">
              <div className="avatar-container">
                {enrichedProfile.github_data.avatar_url ? (
                  <img src={enrichedProfile.github_data.avatar_url} alt={enrichedProfile.name} className="avatar" />
                ) : (
                  <div className="avatar-initials">{getInitials(enrichedProfile.name)}</div>
                )}
              </div>
              <div className="header-info">
                <h2>{enrichedProfile.name}</h2>
                <div className="contact-info">
                  {enrichedProfile.email && (
                    <span><i className="ti ti-mail"></i> {enrichedProfile.email}</span>
                  )}
                  {enrichedProfile.phone && (
                    <span><i className="ti ti-phone"></i> {enrichedProfile.phone}</span>
                  )}
                  {enrichedProfile.location && (
                    <span><i className="ti ti-map-pin"></i> {enrichedProfile.location}</span>
                  )}
                </div>
                <div className="links">
                  {enrichedProfile.links.github && (
                    <a href={ensureProtocol(enrichedProfile.links.github)} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-github"></i></a>
                  )}
                  {enrichedProfile.links.linkedin && (
                    <a href={ensureProtocol(enrichedProfile.links.linkedin)} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-linkedin"></i></a>
                  )}
                  {enrichedProfile.links.portfolio && (
                    <a href={ensureProtocol(enrichedProfile.links.portfolio)} target="_blank" rel="noopener noreferrer"><i className="ti ti-world"></i></a>
                  )}
                </div>
              </div>
            </div>

            {enrichedProfile.summary && (
              <div className="subsection">
                <h4 className="subsection-header">Summary</h4>
                <p className="summary-text">{enrichedProfile.summary}</p>
              </div>
            )}

            {Object.values(enrichedProfile.skills || {}).some(s => s && s.length > 0) && (
              <div className="subsection">
                <h4 className="subsection-header">Skills</h4>
                <div className="skills-grid">
                  {Object.entries(enrichedProfile.skills || {}).map(([category, skills]) => (
                    (skills || []).length > 0 && (
                      <div key={category} className="skill-category">
                        <h4 className="skill-category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                        <div className="skill-pills">
                          {(skills || []).map((skill, i) => (
                            <span key={i} className="skill-pill">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {enrichedProfile.experience && enrichedProfile.experience.length > 0 && (
              <div className="subsection">
                <h4 className="subsection-header">Experience</h4>
                <div className="timeline">
                  {(enrichedProfile.experience || []).map((exp, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <h4>{exp.title}</h4>
                        <p className="timeline-company">{exp.company} · {exp.duration}</p>
                        {exp.location && <p className="timeline-location">{exp.location}</p>}
                        <ul className="timeline-highlights">
                          {(exp.highlights || []).map((h, j) => <li key={j}>{h}</li>)}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enrichedProfile.education && enrichedProfile.education.length > 0 && (
              <div className="subsection">
                <h4 className="subsection-header">Education</h4>
                <div className="education-list">
                  {(enrichedProfile.education || []).map((edu, i) => (
                    <div key={i} className="education-item">
                      <h4>{edu.degree}</h4>
                      <p>{edu.institution}</p>
                      {edu.year && <span className="edu-year">{edu.year}</span>}
                      {edu.gpa && <span className="edu-gpa">GPA: {edu.gpa}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enrichedProfile.projects && enrichedProfile.projects.length > 0 && (
              <div className="subsection">
                <h4 className="subsection-header">Projects</h4>
                <div className="projects-grid">
                  {(enrichedProfile.projects || []).map((proj, i) => (
                    <div key={i} className="project-card">
                      <div className="project-header">
                        <h4>{proj.name}</h4>
                        {proj.link && <a href={proj.link} target="_blank" rel="noopener noreferrer"><i className="ti ti-link"></i></a>}
                      </div>
                      <p className="project-desc">{proj.description}</p>
                      <div className="project-tech">
                        {(proj.technologies || []).map((t, j) => (
                          <span key={j} className="tech-pill">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enrichedProfile.certifications && enrichedProfile.certifications.length > 0 && (
              <div className="subsection">
                <h4 className="subsection-header">Certifications</h4>
                <ul className="certifications-list">
                  {(enrichedProfile.certifications || []).map((cert, i) => <li key={i}>{cert}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Section 2: Parsed GitHub Content */}
          <div className="section">
            <h3 className="section-header"><i className="ti ti-brand-github"></i> Parsed GitHub Content</h3>
            {enrichedProfile.github_data.fetch_status === 'success' ? (
              <div className="github-panel">
                <div className="github-header">
                  <i className="ti ti-check verified-badge"> Verified</i>
                  {enrichedProfile.github_data.avatar_url && (
                    <img src={enrichedProfile.github_data.avatar_url} alt="GitHub" className="github-avatar" />
                  )}
                  <div>
                    <p className="github-bio">{enrichedProfile.github_data.bio}</p>
                    <p className="github-followers">
                      <i className="ti ti-users"></i> {enrichedProfile.github_data.followers} followers · 
                      <i className="ti ti-folder"></i> {enrichedProfile.github_data.total_repos} repositories
                    </p>
                  </div>
                </div>
                <div className="github-languages">
                  {enrichedProfile.github_data.all_languages.map((lang, i) => (
                    <span key={i} className="language-pill">{lang}</span>
                  ))}
                </div>
                <div className="github-repos">
                  {enrichedProfile.github_data.top_repos.map((repo, i) => (
                    <div key={i} className="repo-card">
                      <div className="repo-header">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="repo-name">{repo.name}</a>
                        {repo.language && <span className="repo-language">{repo.language}</span>}
                      </div>
                      {repo.description && <p className="repo-description">{repo.description}</p>}
                      <div className="repo-meta">
                        <span className="repo-stat"><i className="ti ti-star"></i> {repo.stars}</span>
                        <span className="repo-stat"><i className="ti ti-git-branch"></i> {repo.forks}</span>
                        <span className="repo-stat"><i className="ti ti-eye"></i> {repo.watchers}</span>
                        <span className="repo-stat"><i className="ti ti-alert-circle"></i> {repo.open_issues} issues</span>
                      </div>
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="repo-topics">
                          {repo.topics.map((topic, j) => (
                            <span key={j} className="topic-pill">{topic}</span>
                          ))}
                        </div>
                      )}
                      <div className="repo-dates">
                        <span>Created: {new Date(repo.created_at).toLocaleDateString()}</span>
                        <span>Updated: {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : enrichedProfile.github_data.fetch_status === 'failed' ? (
              <div className="status-badge failed"><i className="ti ti-x"></i> GitHub unavailable</div>
            ) : (
              <div className="status-badge skipped"><i className="ti ti-circle-x"></i> No GitHub found</div>
            )}
          </div>

          {/* Section 3: Accessible URLs with Data */}
          <div className="section">
            <h3 className="section-header"><i className="ti ti-link"></i> URL Results</h3>
            {processedUrls.length > 0 ? (
              <div className="urls-list">
                {processedUrls.map((item, i) => (
                  <div key={i} className="url-item-card" style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    background: item.accessible ? '#f0fff4' : '#fff0f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      {item.accessible ? (
                        <i className="ti ti-check" style={{ color: 'var(--success)' }}></i>
                      ) : (
                        <i className="ti ti-x" style={{ color: '#dc2626' }}></i>
                      )}
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.name}</h4>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: item.accessible ? '#dcfce7' : '#fee2e2',
                        color: item.accessible ? '#166534' : '#991b1b'
                      }}>
                        {item.data?.source || 'unknown'}
                      </span>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      wordBreak: 'break-all',
                      display: 'inline-block',
                      marginBottom: '10px'
                    }}>
                      <i className="ti ti-external-link"></i> {item.url}
                    </a>
                    {item.data && (
                      <div className="url-data" style={{ fontSize: '0.9rem' }}>
                        {/* Error display */}
                        {(item.data.error || item.error) && (
                          <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '10px'
                          }}>
                            <p style={{ color: '#991b1b', margin: 0 }}>
                              <i className="ti ti-alert-triangle"></i> Error: {item.data.error || item.error}
                            </p>
                          </div>
                        )}

                        {/* Display all data fields from backend */}
                        <pre style={{
                          background: '#f8fafc',
                          padding: '10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          overflow: 'auto',
                          maxHeight: '400px'
                        }}>
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="status-badge skipped"><i className="ti ti-circle-x"></i> No URLs processed</div>
            )}
          </div>



          {/* Pipeline Section */}
          <div className="section">
            <h3 className="section-header"><i className="ti ti-route"></i> HireMind Pipeline</h3>

            {pipelineState.status === 'running' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.2rem',
                  marginBottom: '16px',
                  fontWeight: 600
                }}>
                  {pipelineState.currentStep}
                </div>
                <div style={{
                  width: '100%',
                  height: '20px',
                  background: '#e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pipelineState.progress}%`,
                    background: 'linear-gradient(90deg, #1565c0, #7B5EA7)',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <div style={{ fontSize: '1rem', color: '#64748b' }}>
                  {pipelineState.progress}% complete
                </div>
              </div>
            )}

            {pipelineState.status === 'failed' && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#991b1b', marginBottom: '12px' }}>
                  <i className="ti ti-alert-triangle"></i> Pipeline failed: {pipelineState.error}
                </p>
                <button className="process-btn" onClick={handleRunPipeline}>
                  <i className="ti ti-refresh" style={{ marginRight: '8px' }}></i>
                  Try Again
                </button>
              </div>
            )}

            {pipelineState.status === 'completed' && pipelineState.results && (
              <div>
                <div style={{
                  background: '#f0fff4',
                  border: '1px solid #dcfce7',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#166534', fontWeight: 600, fontSize: '1.1rem', marginBottom: '12px' }}>
                    <i className="ti ti-check"></i> Pipeline completed successfully!
                  </p>
                  {pipelineState.student_profile_filepath && (
                    <div style={{
                      background: 'var(--color-background-info)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      textAlign: 'left'
                    }}>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>
                        <i className="ti ti-file" style={{ marginRight: '8px' }}></i>
                        Unified Profile Saved:
                      </p>
                      <p style={{
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        wordBreak: 'break-all',
                        margin: 0
                      }}>
                        {pipelineState.student_profile_filepath}
                      </p>
                    </div>
                  )}
                  {hiremindParams.returnUrl && (
                    <button 
                      className="process-btn"
                      onClick={() => window.location.href = hiremindParams.returnUrl}
                      style={{ 
                        background: '#6366F1' 
                      }}
                    >
                      <i className="ti ti-arrow-left" style={{ marginRight: '8px' }}></i>
                      Return to HireMind
                    </button>
                  )}
                </div>

                {/* Agent 2 Results */}
                {pipelineState.results.agent2 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#1e293b' }}>
                      <i className="ti ti-shield-check" style={{ marginRight: '8px' }}></i>
                      Agent 2: Evidence Correlation & Verification
                    </h4>
                    <pre style={{
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(pipelineState.results.agent2.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Agent 3 Results */}
                {pipelineState.results.agent3 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#1e293b' }}>
                      <i className="ti ti-bulb" style={{ marginRight: '8px' }}></i>
                      Agent 3: Hidden Skill Discovery
                    </h4>
                    <pre style={{
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(pipelineState.results.agent3.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Agent 4 Results */}
                {pipelineState.results?.agent4 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#1e293b' }}>
                      <i className="ti ti-target-arrow" style={{ marginRight: '8px' }}></i>
                      Agent 4: Best Role Finder
                    </h4>
                    <pre style={{
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(pipelineState.results.agent4.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Agent 5 Results */}
                {pipelineState.results?.agent5 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#1e293b', fontSize: '1.3rem' }}>
                      <i className="ti ti-shield-check" style={{ marginRight: '8px' }}></i>
                      Agent 5: Project Authenticity System
                    </h4>
                    
                    {/* Overall Authenticity Score */}
                    <div style={{
                      background: (pipelineState.results.agent5.data.overall_authenticity_score || 0) >= 80 
                        ? '#f0fff4' 
                        : (pipelineState.results.agent5.data.overall_authenticity_score || 0) >= 60 
                        ? '#fffbeb' 
                        : '#fff1f2',
                      border: `1px solid ${(pipelineState.results.agent5.data.overall_authenticity_score || 0) >= 80 
                        ? '#86efac' 
                        : (pipelineState.results.agent5.data.overall_authenticity_score || 0) >= 60 
                        ? '#fcd34d' 
                        : '#fca5a5'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ margin: '0 0 8px 0' }}>
                        Overall Authenticity: {pipelineState.results.agent5.data.overall_authenticity_score || 0}
                      </h3>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 600, 
                        color: (pipelineState.results.agent5.data.verdict_level || '') === 'Highly Authentic' 
                          ? '#16a34a' 
                          : (pipelineState.results.agent5.data.verdict_level || '') === 'Mostly Authentic' 
                          ? '#d97706' 
                          : (pipelineState.results.agent5.data.verdict_level || '') === 'Partially Authentic' 
                          ? '#dc2626' 
                          : '#991b1b'
                      }}>
                        {pipelineState.results.agent5.data.verdict} ({pipelineState.results.agent5.data.verdict_level})
                      </div>
                      <p style={{ marginTop: '12px', marginBottom: '0' }}>
                        {pipelineState.results.agent5.data.recruiter_summary}
                      </p>
                    </div>

                    {/* Cross-Agent Conflicts (Most Prominent) */}
                    {pipelineState.results.agent5.data.cross_agent_conflicts && pipelineState.results.agent5.data.cross_agent_conflicts.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ marginBottom: '12px', color: '#dc2626' }}>
                          <i className="ti ti-alert-triangle" style={{ marginRight: '8px' }}></i>
                          Cross-Agent Conflicts Detected ({pipelineState.results.agent5.data.cross_agent_conflicts.length})
                        </h5>
                        {pipelineState.results.agent5.data.cross_agent_conflicts.map((conflict, idx) => (
                          <div key={idx} style={{
                            background: '#fff1f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{conflict.conflict_type}</span>
                              <span style={{ 
                                fontSize: '0.8rem', 
                                padding: '2px 8px', 
                                borderRadius: '999px',
                                background: (conflict.severity || '') === 'critical' ? '#fee2e2' : (conflict.severity || '') === 'high' ? '#ffedd5' : (conflict.severity || '') === 'medium' ? '#fef3c7' : '#fef9c3',
                                color: (conflict.severity || '') === 'critical' ? '#991b1b' : (conflict.severity || '') === 'high' ? '#c2410c' : (conflict.severity || '') === 'medium' ? '#92400e' : '#713f12'
                              }}>
                                {(conflict.severity || '').toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                              <strong>{conflict.agent_a}</strong> vs <strong>{conflict.agent_b}</strong>: {conflict.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Projects */}
                    <div>
                      <h5 style={{ marginBottom: '12px', color: '#1e293b' }}>
                        <i className="ti ti-folder" style={{ marginRight: '8px' }}></i>
                        Project Authenticity Details
                      </h5>
                      {(pipelineState.results.agent5.data.projects || []).map((project, idx) => (
                        <div key={idx} style={{
                          background: '#f8fafc',
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '12px',
                          border: `1px solid ${project.genuinely_built ? '#86efac' : '#fecaca'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h6 style={{ margin: 0, fontSize: '1.05rem' }}>
                              {project.project_name}
                            </h6>
                            <div style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 600,
                              color: (project.final_verdict || '').toLowerCase().includes('genuine') 
                                ? '#16a34a' 
                                : (project.final_verdict || '').toLowerCase().includes('partial') 
                                ? '#d97706' 
                                : '#dc2626'
                            }}>
                              {project.final_verdict} ({project.authenticity_score || 0}/100)
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <span style={{ fontWeight: 500, color: '#64748b' }}>AI Assistance:</span>
                              <span style={{ marginLeft: '8px', fontWeight: 600 }}>{project.ai_assistance_level}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 500, color: '#64748b' }}>Complexity Match:</span>
                              <span style={{ marginLeft: '8px', fontWeight: 600 }}>{project.complexity_match}</span>
                            </div>
                          </div>

                          {(project.green_flags || []).length > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                              {(project.green_flags || []).map((flag, i) => (
                                <span key={i} style={{
                                  background: '#dcfce7',
                                  color: '#166534',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.8rem',
                                  marginRight: '6px',
                                  marginBottom: '6px',
                                  display: 'inline-block'
                                }}>
                                  <i className="ti ti-check" style={{ marginRight: '4px' }}></i>
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}

                          {(project.red_flags || []).length > 0 && (
                            <div>
                              {(project.red_flags || []).map((flag, i) => (
                                <span key={i} style={{
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.8rem',
                                  marginRight: '6px',
                                  marginBottom: '6px',
                                  display: 'inline-block'
                                }}>
                                  <i className="ti ti-x" style={{ marginRight: '4px' }}></i>
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Full Report (Collapsible) */}
                    <details style={{ marginTop: '16px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                        View Full Authenticity Report
                      </summary>
                      <pre style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        overflow: 'auto',
                        maxHeight: '300px',
                        marginTop: '8px'
                      }}>
                        {JSON.stringify(pipelineState.results.agent5.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Agent 6 Results */}
                {pipelineState.results?.agent6 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#1e293b', fontSize: '1.3rem' }}>
                      <i className="ti ti-code-circle" style={{ marginRight: '8px' }}></i>
                      Agent 6: Technical Depth Assessment
                    </h4>

                    {/* Overall Technical Depth Score */}
                    <div style={{
                      background: (pipelineState.results.agent6.data.overall_technical_depth_score || 0) >= 80 
                        ? '#f0fff4' 
                        : (pipelineState.results.agent6.data.overall_technical_depth_score || 0) >= 60 
                        ? '#fffbeb' 
                        : '#fff1f2',
                      border: `1px solid ${(pipelineState.results.agent6.data.overall_technical_depth_score || 0) >= 80 
                        ? '#86efac' 
                        : (pipelineState.results.agent6.data.overall_technical_depth_score || 0) >= 60 
                        ? '#fcd34d' 
                        : '#fca5a5'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ margin: '0 0 8px 0' }}>
                        Overall Technical Depth: {pipelineState.results.agent6.data.overall_technical_depth_score || 0}
                      </h3>
                      <p style={{ marginTop: '12px', marginBottom: '0', fontSize: '1rem' }}>
                        {pipelineState.results.agent6.data.recruiter_summary}
                      </p>
                    </div>

                    {/* Strongest/Weakest Areas */}
                    {((pipelineState.results.agent6.data.strongest_technical_areas || []).length > 0 || (pipelineState.results.agent6.data.weakest_technical_areas || []).length > 0) && (
                      <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {(pipelineState.results.agent6.data.strongest_technical_areas || []).length > 0 && (
                          <div style={{ background: '#f0fff4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px' }}>
                            <h5 style={{ margin: '0 0 8px 0', color: '#16a34a' }}>
                              <i className="ti ti-trending-up" style={{ marginRight: '6px' }}></i>
                              Strongest Areas
                            </h5>
                            <ul style={{ margin: '0', paddingLeft: '18px' }}>
                              {pipelineState.results.agent6.data.strongest_technical_areas.map((area, idx) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(pipelineState.results.agent6.data.weakest_technical_areas || []).length > 0 && (
                          <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                            <h5 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>
                              <i className="ti ti-trending-down" style={{ marginRight: '6px' }}></i>
                              Weakest Areas
                            </h5>
                            <ul style={{ margin: '0', paddingLeft: '18px' }}>
                              {pipelineState.results.agent6.data.weakest_technical_areas.map((area, idx) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interview Recommendation */}
                    {pipelineState.results.agent6.data.interview_recommendation && (
                      <div style={{
                        background: '#dbeafe',
                        border: '1px solid #93c5fd',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>
                          <i className="ti ti-chalkboard" style={{ marginRight: '6px' }}></i>
                          Interview Recommendation
                        </h5>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>
                          {pipelineState.results.agent6.data.interview_recommendation.suggested_round_type}
                        </p>
                        {(pipelineState.results.agent6.data.interview_recommendation.topics_to_test || []).length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <strong>Topics to test:</strong> {pipelineState.results.agent6.data.interview_recommendation.topics_to_test.join(', ')}
                          </div>
                        )}
                        {(pipelineState.results.agent6.data.interview_recommendation.topics_to_avoid_assuming || []).length > 0 && (
                          <div>
                            <strong>Topics to avoid assuming:</strong> {pipelineState.results.agent6.data.interview_recommendation.topics_to_avoid_assuming.join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Skills Assessed */}
                    {(pipelineState.results.agent6.data.skills_assessed || []).length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ marginBottom: '12px', color: '#1e293b' }}>
                          <i className="ti ti-star" style={{ marginRight: '8px' }}></i>
                          Skills Assessed
                        </h5>
                        {(pipelineState.results.agent6.data.skills_assessed || []).map((skill, idx) => (
                          <div key={idx} style={{
                            background: '#f8fafc',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '8px',
                            border: skill.level_gap_detected ? '1px solid #fecaca' : '1px solid #e2e8f0'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{skill.skill}</span>
                              <span style={{
                                fontSize: '0.8rem',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: (skill.interview_readiness || '').includes('hard') ? '#fee2e2' 
                                  : (skill.interview_readiness || '').includes('medium') ? '#fef3c7' 
                                  : (skill.interview_readiness || '').includes('Fundamentals') ? '#e0f2fe' 
                                  : '#f1f5f9',
                                color: (skill.interview_readiness || '').includes('hard') ? '#991b1b' 
                                  : (skill.interview_readiness || '').includes('medium') ? '#92400e' 
                                  : (skill.interview_readiness || '').includes('Fundamentals') ? '#1e40af' 
                                  : '#475569'
                              }}>
                                {skill.interview_readiness}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                              <span style={{ color: '#64748b' }}>Claimed:</span> {skill.claimed_level}
                              <span style={{ marginLeft: '12px', color: '#64748b' }}>Evidenced:</span> {skill.evidenced_level}
                            </div>
                            {skill.level_gap_detected && (
                              <div style={{
                                fontSize: '0.85rem',
                                color: '#dc2626',
                                marginBottom: '4px'
                              }}>
                                ⚠️ Gap detected: {skill.gap_explanation}
                              </div>
                            )}
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              Recommended focus: {skill.recommended_interview_focus}
                            </div>
                            <details style={{ marginTop: '6px' }}>
                              <summary style={{ fontSize: '0.85rem', cursor: 'pointer' }}>View Problem Solving Evidence</summary>
                              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#475569' }}>
                                {skill.problem_solving_evidence.platform && (
                                  <div>Platform: {skill.problem_solving_evidence.platform}</div>
                                )}
                                <div>
                                  Easy: {skill.problem_solving_evidence.easy_solved || 0}
                                  {' | '}
                                  Medium: {skill.problem_solving_evidence.medium_solved || 0}
                                  {' | '}
                                  Hard: {skill.problem_solving_evidence.hard_solved || 0}
                                </div>
                                {skill.problem_solving_evidence.stars_or_rating && (
                                  <div>Stars/Rating: {skill.problem_solving_evidence.stars_or_rating}</div>
                                )}
                                <div>Evidence Strength: {skill.problem_solving_evidence.evidence_strength || 'N/A'}</div>
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Problem Solving Summary */}
                    {pipelineState.results.agent6.data.problem_solving_summary && (
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
                          <i className="ti ti-chart-histogram" style={{ marginRight: '6px' }}></i>
                          Problem Solving Summary
                        </h5>
                        <div style={{ fontSize: '0.9rem' }}>
                          Total Problems Solved: {pipelineState.results.agent6.data.problem_solving_summary.total_problems_solved || 0}
                        </div>
                        {pipelineState.results.agent6.data.problem_solving_summary.difficulty_distribution && (
                          <div style={{ fontSize: '0.9rem' }}>
                            Difficulty Distribution: {pipelineState.results.agent6.data.problem_solving_summary.difficulty_distribution}
                          </div>
                        )}
                        {pipelineState.results.agent6.data.problem_solving_summary.consistency_rating && (
                          <div style={{ fontSize: '0.9rem' }}>
                            Consistency Rating: {pipelineState.results.agent6.data.problem_solving_summary.consistency_rating}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Full Report (Collapsible) */}
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                        View Full Technical Depth Report
                      </summary>
                      <pre style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        overflow: 'auto',
                        maxHeight: '300px',
                        marginTop: '8px'
                      }}>
                        {JSON.stringify(pipelineState.results.agent6.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
}

export default App;
