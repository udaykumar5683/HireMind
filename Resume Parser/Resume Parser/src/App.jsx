import { useState, useRef, useEffect } from 'react';
import './App.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

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
  
  // Form input states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [customUrls, setCustomUrls] = useState([]); // [{ id: number, name: string, url: string }]
  
  // UI interaction & validation states
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errors, setErrors] = useState({ name: null, email: null, file: null });
  const [touched, setTouched] = useState({ name: false, email: false, file: false });

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
    if (!isProcessing) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!isProcessing && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      if (errors.file) {
        setErrors((prev) => ({ ...prev, file: null }));
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (errors.file) {
        setErrors((prev) => ({ ...prev, file: null }));
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileObj) => {
    if (!fileObj) return 'ti-file';
    const type = fileObj.type || '';
    const fileName = fileObj.name || '';
    if (type.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) return 'ti-file-type-pdf';
    if (type.includes('image') || /\.(png|jpg|jpeg|webp)$/i.test(fileName)) return 'ti-photo';
    return 'ti-file-text';
  };

  const validateField = (fieldName, value) => {
    let error = null;
    if (fieldName === 'name') {
      if (!value || !value.trim()) error = 'Full Name is required';
    } else if (fieldName === 'email') {
      if (!value || !value.trim()) {
        error = 'Email Address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        error = 'Please enter a valid email address';
      }
    } else if (fieldName === 'file') {
      if (!value) error = 'Please upload a resume file';
    }
    return error;
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    let val = fieldName === 'name' ? name : fieldName === 'email' ? email : file;
    const err = validateField(fieldName, val);
    setErrors((prev) => ({ ...prev, [fieldName]: err }));
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

    const response = await fetch(`${API_BASE_URL}/parse-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: {
        model: 'openai/gpt-oss-120b',
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0
      }})
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices returned from Groq API');
    }

    let content = data.choices[0].message.content || '';
    
    // Find JSON boundary
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    } else {
      content = content.replace(/```json|```/g, '').trim();
    }

    try {
      return JSON.parse(content);
    } catch (parseErr) {
      console.warn("Initial JSON parse failed, attempting auto-repair:", parseErr);
      // Remove trailing commas and clean control characters
      let sanitized = content
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');

      try {
        return JSON.parse(sanitized);
      } catch (secondErr) {
        throw new Error(`Failed to parse AI resume JSON: ${secondErr.message}`);
      }
    }
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
      const requestUrl = url.startsWith('https://api.github.com/')
        ? `${API_BASE_URL}/github/${url.slice('https://api.github.com/'.length)}`
        : url;
      const res = await fetch(requestUrl, options);
      
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
    const headers = {};

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
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const fileErr = validateField('file', file);

    const newErrors = { name: nameErr, email: emailErr, file: fileErr };
    setErrors(newErrors);
    setTouched({ name: true, email: true, file: true });

    if (nameErr || emailErr || fileErr) {
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
        const saveRes = await fetch(`${API_BASE_URL}/save-profile`, {
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
          setTimeout(() => handleRunPipeline(saveData.agent1_data || saveData.filepath), 500);
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
      alert(`Error processing resume: ${err.message || 'Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunPipeline = async (param) => {
    let payload = {};
    if (param && typeof param === 'object') {
      payload = { agent1_data: param };
    } else {
      const targetPath = (typeof param === 'string' ? param : null) || savedFilePath;
      if (enrichedProfile) {
        payload = { profile: enrichedProfile, processed_urls: processedUrls || [] };
      } else if (targetPath) {
        payload = { filepath: targetPath };
      } else {
        alert('No saved profile to process');
        return;
      }
    }

    setPipelineState({
      status: 'running',
      progress: 0,
      currentStep: 'Initializing pipeline...',
      results: null,
      error: null
    });

    try {
      const runRes = await fetch(`${API_BASE_URL}/run-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!runRes.ok) {
        const err = await runRes.json();
        throw new Error(err.error || 'Failed to start pipeline');
      }

      // Poll for pipeline status
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`${API_BASE_URL}/pipeline-status`);
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
      const res = await fetch(`${API_BASE_URL}/extract-url`, {
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

  // Helper to render recruiter-friendly URL result cards
  const renderUrlDataCard = (item) => {
    if (!item) return null;
    const d = item.data || {};
    const source = (d.source || item.name || '').toLowerCase();
    const itemUrlName = (item.name || '').toLowerCase();

    return (
      <div className="url-result-card" key={item.url}>
        {/* Header bar */}
        <div className="url-card-header">
          <div className="url-card-title-group">
            <i className={`ti ${item.accessible ? 'ti-circle-check-filled text-emerald' : 'ti-alert-circle-filled text-rose'}`}></i>
            <h4 className="url-card-name">{item.name}</h4>
            <span className={`status-badge-sm ${item.accessible ? 'bg-emerald' : 'bg-rose'}`}>
              {(d.source || item.name || 'URL').toUpperCase()}
            </span>
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="url-card-link">
            <i className="ti ti-external-link"></i> {item.url}
          </a>
        </div>

        {/* Error Banner */}
        {(d.error || item.error) && (
          <div className="recruiter-alert recruiter-alert-danger">
            <i className="ti ti-alert-triangle"></i>
            <span><strong>Fetch Warning:</strong> {d.error || item.error}</span>
          </div>
        )}

        {/* Structured Content based on URL Source */}
        {d && (source.includes('github') || itemUrlName.includes('github')) ? (
          <div className="url-structured-body">
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-value">{d.followers ?? '0'}</span>
                <span className="metric-label"><i className="ti ti-users"></i> Followers</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{d.public_repos ?? d.total_repos ?? (d.repositories?.length || 0)}</span>
                <span className="metric-label"><i className="ti ti-folder"></i> Repositories</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{d.total_stars ?? 0}</span>
                <span className="metric-label"><i className="ti ti-star"></i> Total Stars</span>
              </div>
            </div>

            {d.bio && (
              <div className="url-info-section">
                <p className="url-bio">"{d.bio}"</p>
              </div>
            )}

            {d.top_languages && d.top_languages.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title">Primary Languages:</span>
                <div className="tag-pills">
                  {d.top_languages.map((lang, idx) => (
                    <span key={idx} className="tag-pill tag-purple">{lang}</span>
                  ))}
                </div>
              </div>
            )}

            {d.repositories && d.repositories.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title">Key Repositories ({d.repositories.length}):</span>
                <div className="url-sublist">
                  {d.repositories.slice(0, 5).map((repo, idx) => (
                    <div key={idx} className="url-subitem">
                      <div className="repo-top">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="repo-title-link">
                          <i className="ti ti-brand-github"></i> {repo.name}
                        </a>
                        {repo.language && <span className="tag-pill tag-neutral">{repo.language}</span>}
                      </div>
                      {repo.description && <p className="repo-desc">{repo.description}</p>}
                      <div className="repo-stats-row">
                        <span><i className="ti ti-star"></i> {repo.stars || 0}</span>
                        <span><i className="ti ti-git-branch"></i> {repo.forks || 0}</span>
                        {repo.updated_at && <span><i className="ti ti-calendar"></i> {repo.updated_at}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : d && (source.includes('hackerrank') || itemUrlName.includes('hackerrank')) ? (
          <div className="url-structured-body">
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-value">{d.points ?? 'N/A'}</span>
                <span className="metric-label"><i className="ti ti-award"></i> Total Points</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{d.level ?? 'N/A'}</span>
                <span className="metric-label"><i className="ti ti-trending-up"></i> Hacker Level</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{d.badges?.length || 0}</span>
                <span className="metric-label"><i className="ti ti-certificate"></i> Badges</span>
              </div>
            </div>

            {d.badges && d.badges.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title">Badges & Skills:</span>
                <div className="tag-pills">
                  {d.badges.map((b, idx) => (
                    <span key={idx} className="tag-pill tag-amber">
                      <i className="ti ti-star-filled"></i> {b.name} ({b.stars || 0}★)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : d && (source.includes('leetcode') || itemUrlName.includes('leetcode')) ? (
          <div className="url-structured-body">
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-value">{d.total_solved ?? (d.easy_solved + d.medium_solved + d.hard_solved) ?? 'N/A'}</span>
                <span className="metric-label"><i className="ti ti-check"></i> Problems Solved</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{d.ranking ? `#${d.ranking}` : 'N/A'}</span>
                <span className="metric-label"><i className="ti ti-trophy"></i> Global Rank</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{d.acceptance_rate ? `${d.acceptance_rate}%` : 'N/A'}</span>
                <span className="metric-label"><i className="ti ti-percentage"></i> Acceptance</span>
              </div>
            </div>

            <div className="url-info-section">
              <span className="url-info-title">Difficulty Breakdown:</span>
              <div className="tag-pills">
                {d.easy_solved !== undefined && <span className="tag-pill tag-emerald">Easy: {d.easy_solved}</span>}
                {d.medium_solved !== undefined && <span className="tag-pill tag-amber">Medium: {d.medium_solved}</span>}
                {d.hard_solved !== undefined && <span className="tag-pill tag-rose">Hard: {d.hard_solved}</span>}
              </div>
            </div>
          </div>
        ) : d && (source.includes('linkedin') || itemUrlName.includes('linkedin')) ? (
          /* Recruiter-Friendly LinkedIn Profile Component */
          <div className="url-structured-body">
            {/* Candidate Header / Intro Meta */}
            <div className="archetype-banner mb-16">
              <div className="archetype-info">
                <span className="archetype-title">
                  <i className="ti ti-brand-linkedin text-indigo"></i> {d.name || d.headline?.split('|')[0] || item.name || 'LinkedIn Profile'}
                </span>
                {d.headline && <p className="pitch-body mt-4">"{d.headline}"</p>}
                <div className="meta-pills mt-8">
                  {d.location && <span className="tag-pill tag-blue"><i className="ti ti-map-pin"></i> {d.location}</span>}
                  {d.connections !== undefined && <span className="tag-pill tag-purple"><i className="ti ti-users"></i> {d.connections}+ Connections</span>}
                  {d.source && <span className="tag-pill tag-neutral"><i className="ti ti-world"></i> LinkedIn Verified</span>}
                </div>
              </div>
            </div>

            {/* Summary / Bio */}
            {d.summary && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-user-check"></i> Professional Summary</span>
                <p className="url-text-desc">{d.summary}</p>
              </div>
            )}

            {/* Work Experiences */}
            {d.experiences && d.experiences.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-briefcase"></i> Work Experience ({d.experiences.length})</span>
                <div className="recruiter-grid-list">
                  {d.experiences.map((exp, idx) => (
                    <div key={idx} className="verified-item-card border-indigo">
                      <div className="item-title-row">
                        <span className="item-title">{exp.title || 'Role'}</span>
                        {exp.company && <span className="badge-small bg-indigo">{exp.company}</span>}
                      </div>
                      {(exp.starts_at || exp.duration) && (
                        <p className="item-reasoning text-indigo mt-4">
                          <i className="ti ti-calendar"></i> {exp.duration || `${exp.starts_at || ''} - ${exp.ends_at || 'Present'}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {d.education && d.education.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-school"></i> Education</span>
                <div className="recruiter-grid-list">
                  {d.education.map((edu, idx) => (
                    <div key={idx} className="verified-item-card border-purple">
                      <div className="item-title-row">
                        <span className="item-title">{edu.school || 'University'}</span>
                      </div>
                      <p className="item-reasoning mt-4">
                        {edu.degree} {edu.field ? `in ${edu.field}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Endorsed Skills */}
            {d.skills && d.skills.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-list-check"></i> Endorsed Skills ({d.skills.length}):</span>
                <div className="tag-pills">
                  {d.skills.map((s, idx) => <span key={idx} className="tag-pill tag-blue">{typeof s === 'string' ? s : s.name}</span>)}
                </div>
              </div>
            )}

            {/* Certifications */}
            {d.certifications && d.certifications.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-certificate"></i> Certifications:</span>
                <div className="tag-pills">
                  {d.certifications.map((c, idx) => <span key={idx} className="tag-pill tag-amber"><i className="ti ti-award"></i> {typeof c === 'string' ? c : c.name}</span>)}
                </div>
              </div>
            )}

            {/* Fallback for Web Scraped Sections */}
            {!d.experiences && !d.summary && Object.keys(d).some(k => k.startsWith('section_')) && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-file-text"></i> Profile Sections Extracted</span>
                {Object.entries(d).filter(([k]) => k.startsWith('section_')).map(([key, val], idx) => (
                  <div key={idx} className="info-card mb-8">
                    <span className="sublabel">{key.replace('section_', '').replace(/_/g, ' ').toUpperCase()}</span>
                    <p className="box-text mt-4">{val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Recruiter-Friendly Portfolio / Personal Website Component */
          <div className="url-structured-body">
            {(d.title || d.meta_description || d.description) && (
              <div className="archetype-banner mb-16">
                <div className="archetype-info">
                  <span className="archetype-title">
                    <i className="ti ti-world text-emerald"></i> {d.title || item.name || 'Personal Portfolio'}
                  </span>
                  {(d.meta_description || d.description) && (
                    <p className="pitch-body mt-4">"{d.meta_description || d.description}"</p>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Emails & Contact Info */}
            {d.emails_found && d.emails_found.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-mail"></i> Extracted Contact Details:</span>
                <div className="tag-pills">
                  {d.emails_found.map((email, idx) => (
                    <span key={idx} className="tag-pill tag-emerald"><i className="ti ti-mail"></i> {email}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links & Profiles Discovered */}
            {d.social_links_found && d.social_links_found.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-link"></i> Linked Profiles Discovered:</span>
                <div className="tag-pills">
                  {d.social_links_found.map((link, idx) => (
                    <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="tag-pill tag-purple-outline">
                      <i className="ti ti-external-link"></i> {link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Discovered */}
            {d.skills_found && d.skills_found.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-sparkles"></i> Portfolio Skills Identified:</span>
                <div className="tag-pills">
                  {d.skills_found.map((s, idx) => <span key={idx} className="tag-pill tag-blue">{s}</span>)}
                </div>
              </div>
            )}

            {/* Page Architecture / Sections */}
            {d.sections && d.sections.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-layout-grid"></i> Page Architecture & Sections:</span>
                <div className="tag-pills">
                  {d.sections.slice(0, 8).map((sec, idx) => (
                    <span key={idx} className="tag-pill tag-neutral">
                      <strong>{sec.level?.toUpperCase()}:</strong> {sec.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Discovered */}
            {d.projects_found && d.projects_found.length > 0 && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-folder"></i> Showcase Projects Discovered ({d.projects_found.length}):</span>
                <div className="recruiter-grid-list">
                  {d.projects_found.map((p, idx) => (
                    <div key={idx} className="verified-item-card border-emerald">
                      <div className="item-title-row">
                        <span className="item-title">{typeof p === 'string' ? p : p.name || p.title}</span>
                      </div>
                      {typeof p === 'object' && p.description && (
                        <p className="item-reasoning mt-4">{p.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Text Summary fallback if no other sections exist */}
            {d.full_text && (!d.sections || d.sections.length === 0) && (!d.projects_found || d.projects_found.length === 0) && (
              <div className="url-info-section">
                <span className="url-info-title"><i className="ti ti-file-text"></i> Site Content Summary:</span>
                <p className="url-text-desc">{d.full_text.slice(0, 450)}...</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to render JSON file payload as a visual structured property tree
  const StructuredPayloadGrid = ({ payload }) => {
    const [copied, setCopied] = useState(false);

    if (!payload || typeof payload !== 'object') {
      return <div className="text-muted">No audit payload available</div>;
    }

    const handleCopy = () => {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const renderValue = (val) => {
      if (val === null || val === undefined) {
        return <span className="val-badge val-null">N/A</span>;
      }
      if (typeof val === 'boolean') {
        return <span className={`status-pill ${val ? 'status-verified' : 'status-unverified'}`}>{val ? 'TRUE' : 'FALSE'}</span>;
      }
      if (typeof val === 'number') {
        return <span className="tag-pill tag-purple">{val}</span>;
      }
      if (typeof val === 'string') {
        if (val.includes('verified') || val.includes('unverified')) {
          return <span className={`status-pill status-${val}`}>{val.replace('_', ' ').toUpperCase()}</span>;
        }
        return <span className="val-text-content">{val}</span>;
      }
      if (Array.isArray(val)) {
        if (val.length === 0) return <span className="val-text-muted">Empty (0 items)</span>;
        return (
          <div className="structured-array-container">
            {val.map((item, idx) => (
              <div key={idx} className="structured-array-card">
                <span className="array-item-badge">Item #{idx + 1}</span>
                <div className="array-item-body">
                  {typeof item === 'object' && item !== null ? (
                    <div className="structured-object-rows">
                      {Object.entries(item).map(([k, v]) => (
                        <div key={k} className="structured-kv-row">
                          <span className="kv-key-label">{k.replace(/_/g, ' ').toUpperCase()}:</span>
                          <div className="kv-val-box">{renderValue(v)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    renderValue(item)
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
      if (typeof val === 'object') {
        return (
          <div className="structured-object-rows">
            {Object.entries(val).map(([k, v]) => (
              <div key={k} className="structured-kv-row">
                <span className="kv-key-label">{k.replace(/_/g, ' ').toUpperCase()}:</span>
                <div className="kv-val-box">{renderValue(v)}</div>
              </div>
            ))}
          </div>
        );
      }
      return String(val);
    };

    return (
      <div className="structured-payload-container">
        <div className="structured-payload-toolbar">
          <div className="toolbar-title-group">
            <i className="ti ti-sitemap text-indigo"></i>
            <span className="toolbar-title">Audit File Payload - Structured Data Tree</span>
          </div>
          <button onClick={handleCopy} className="btn-copy-json">
            <i className={`ti ${copied ? 'ti-check text-emerald' : 'ti-copy'}`}></i>
            {copied ? 'Copied Payload!' : 'Copy Data'}
          </button>
        </div>

        <div className="structured-payload-grid-body">
          {Object.entries(payload).map(([rootKey, rootVal]) => (
            <div key={rootKey} className="structured-root-card">
              <div className="root-card-header">
                <i className="ti ti-folder text-purple"></i>
                <span className="root-key-title">{rootKey.replace(/_/g, ' ').toUpperCase()}</span>
                <span className="plain-key-badge">({rootKey})</span>
              </div>
              <div className="root-card-content">
                {renderValue(rootVal)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper for syntax highlighting raw JSON payload
  const JsonSyntaxHighlighter = ({ json }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const renderJsonValue = (val, level = 0) => {
      const indent = '  '.repeat(level);

      if (val === null) {
        return <span className="json-null">null</span>;
      }
      if (typeof val === 'boolean') {
        return <span className="json-bool">{val.toString()}</span>;
      }
      if (typeof val === 'number') {
        return <span className="json-number">{val}</span>;
      }
      if (typeof val === 'string') {
        return <span className="json-string">"{val}"</span>;
      }

      if (Array.isArray(val)) {
        if (val.length === 0) return '[]';
        return (
          <span>
            [\n
            {val.map((item, idx) => (
              <span key={idx}>
                {'  '.repeat(level + 1)}
                {renderJsonValue(item, level + 1)}
                {idx < val.length - 1 ? ',' : ''}\n
              </span>
            ))}
            {indent}]
          </span>
        );
      }

      if (typeof val === 'object') {
        const keys = Object.keys(val);
        if (keys.length === 0) return '{}';
        return (
          <span>
            {'{'}\n
            {keys.map((key, idx) => (
              <span key={key}>
                {'  '.repeat(level + 1)}
                <span className="json-key">"{key}"</span>: {renderJsonValue(val[key], level + 1)}
                {idx < keys.length - 1 ? ',' : ''}\n
              </span>
            ))}
            {indent}{'}'}
          </span>
        );
      }

      return String(val);
    };

    return (
      <div className="json-syntax-container">
        <div className="json-syntax-toolbar">
          <span className="json-syntax-title">
            <i className="ti ti-code"></i> Raw JSON Audit Payload (100% Data Parity)
          </span>
          <button onClick={handleCopy} className="btn-copy-json">
            <i className={`ti ${copied ? 'ti-check text-emerald' : 'ti-copy'}`}></i>
            {copied ? 'Copied Payload!' : 'Copy JSON'}
          </button>
        </div>
        <pre className="json-syntax-code">
          <code>{renderJsonValue(json, 0)}</code>
        </pre>
      </div>
    );
  };

  const renderAgent2Output = (data) => {
    if (!data) return null;
    const score = data.credibility_score?.overall_credibility_score ?? data.credibility_score ?? 0;
    const summary = data.evidence_summary || {};
    const verifiedSkills = data.verified_skills || [];
    const partiallyVerifiedSkills = data.partially_verified_skills || [];
    const unverifiedSkills = data.unverified_skills || [];
    const verifiedProjects = data.verified_projects || [];
    const verifiedCerts = data.verified_certifications || [];
    const riskFlags = data.risk_flags || [];

    // Plain Language Technical Key Dictionary
    const plainLanguageLabels = {
      candidate_name: "Candidate Full Name",
      timestamp: "Audit Generation Timestamp",
      overall_credibility_score: "Overall Credibility Index",
      resume_consistency: "Resume Structure Alignment",
      skill_verification: "Skill Cross-Proof Score",
      project_verification: "Code Repository Proof Score",
      profile_evidence_strength: "Multi-Source Profile Breadth",
      verification_status: "Verification Status Flag",
      confidence_score: "Evidence Confidence Index",
      supporting_sources: "Correlated Proof Sources",
      reasoning: "Finding Analysis & Explanation",
      affected_skill: "Affected Skill Claim",
      affected_project: "Affected Project Claim",
      severity: "Discrepancy Risk Severity"
    };

    return (
      <div className="agent-result-card">
        <div className="agent-card-header">
          <div className="agent-title-group">
            <i className="ti ti-shield-check agent-icon icon-emerald"></i>
            <div>
              <h4 className="agent-name">Agent 2: Evidence Correlation & Verification</h4>
              <p className="agent-subtitle">Cross-verifies candidate claims against online source proof</p>
            </div>
          </div>
          <div className={`score-badge ${score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low'}`}>
            <span className="score-num">{score}</span>
            <span className="score-label">/ 100 Credibility</span>
          </div>
        </div>

        {/* Stat Counters */}
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-value text-emerald">{summary.total_verified_skills ?? verifiedSkills.length}</span>
            <span className="metric-label"><i className="ti ti-circle-check"></i> Verified Skills</span>
          </div>
          <div className="metric-box">
            <span className="metric-value text-indigo">{summary.total_verified_projects ?? verifiedProjects.length}</span>
            <span className="metric-label"><i className="ti ti-folder-check"></i> Verified Projects</span>
          </div>
          <div className="metric-box">
            <span className="metric-value text-purple">{summary.total_verified_certifications ?? verifiedCerts.length}</span>
            <span className="metric-label"><i className="ti ti-certificate"></i> Certifications</span>
          </div>
        </div>

        {/* Risk Flags Section */}
        {riskFlags.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle text-rose">
              <i className="ti ti-alert-triangle"></i> Discrepancy & Risk Flags ({riskFlags.length})
            </h5>
            <div className="risk-flags-list">
              {riskFlags.map((risk, idx) => (
                <div key={idx} className="risk-flag-item">
                  <span className={`risk-severity-badge severity-${(risk.severity || 'medium').toLowerCase()}`}>
                    {(risk.severity || 'MEDIUM').toUpperCase()}
                  </span>
                  <div className="risk-flag-content">
                    <strong>{risk.type || risk.skill || risk.affected_skill || risk.affected_project || 'Discrepancy'}:</strong> {risk.description || risk.reasoning || risk.issue || risk.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Verification Breakdown */}
        <div className="agent-section-block">
          <h5 className="section-subtitle"><i className="ti ti-list-check"></i> Skill Verification Breakdown</h5>
          
          {verifiedSkills.length > 0 && (
            <div className="skill-group-block">
              <span className="group-title text-emerald"><i className="ti ti-check"></i> Verified Skills ({verifiedSkills.length})</span>
              <div className="recruiter-grid-list">
                {verifiedSkills.map((s, idx) => {
                  const skillName = typeof s === 'string' ? s : s.skill;
                  const sources = typeof s === 'object' ? s.supporting_sources || s.sources || [] : [];
                  const reasoning = typeof s === 'object' ? s.reasoning : null;
                  return (
                    <div key={idx} className="verified-item-card border-emerald">
                      <div className="item-title-row">
                        <span className="item-title">{skillName}</span>
                        <span className="badge-small bg-emerald">Verified</span>
                      </div>
                      {sources.length > 0 && (
                        <div className="tag-pills mt-4">
                          {sources.map((src, i) => <span key={i} className="tag-pill tag-emerald-outline">{src}</span>)}
                        </div>
                      )}
                      {reasoning && <p className="item-reasoning">{reasoning}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {partiallyVerifiedSkills.length > 0 && (
            <div className="skill-group-block">
              <span className="group-title text-amber"><i className="ti ti-clock"></i> Partially Verified ({partiallyVerifiedSkills.length})</span>
              <div className="recruiter-grid-list">
                {partiallyVerifiedSkills.map((s, idx) => {
                  const skillName = typeof s === 'string' ? s : s.skill;
                  const reasoning = typeof s === 'object' ? s.reasoning : null;
                  return (
                    <div key={idx} className="verified-item-card border-amber">
                      <div className="item-title-row">
                        <span className="item-title">{skillName}</span>
                        <span className="badge-small bg-amber">Partial Proof</span>
                      </div>
                      {reasoning && <p className="item-reasoning">{reasoning}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {unverifiedSkills.length > 0 && (
            <div className="skill-group-block">
              <span className="group-title text-rose"><i className="ti ti-x"></i> Unverified / Claimed Only ({unverifiedSkills.length})</span>
              <div className="recruiter-grid-list">
                {unverifiedSkills.map((s, idx) => {
                  const skillName = typeof s === 'string' ? s : s.skill;
                  const reasoning = typeof s === 'object' ? s.reasoning : null;
                  return (
                    <div key={idx} className="verified-item-card border-rose">
                      <div className="item-title-row">
                        <span className="item-title">{skillName}</span>
                        <span className="badge-small bg-rose">No Online Proof</span>
                      </div>
                      {reasoning && <p className="item-reasoning">{reasoning}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Verified Projects */}
        {verifiedProjects.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-folder"></i> Project Evidence & Status</h5>
            <div className="recruiter-grid-list">
              {verifiedProjects.map((p, idx) => (
                <div key={idx} className="verified-item-card">
                  <div className="item-title-row">
                    <span className="item-title">{p.project_name || p.name}</span>
                    <span className={`badge-small ${p.verification_status === 'verified' ? 'bg-emerald' : 'bg-amber'}`}>
                      {p.verification_status || 'verified'}
                    </span>
                  </div>
                  {(p.supporting_sources || p.sources) && (p.supporting_sources || p.sources).length > 0 && (
                    <div className="tag-pills mt-4">
                      {(p.supporting_sources || p.sources).map((src, i) => <span key={i} className="tag-pill tag-purple-outline">{src}</span>)}
                    </div>
                  )}
                  {p.reasoning && <p className="item-reasoning">{p.reasoning}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured Verification Audit Inspector */}
        <details className="raw-json-details">
          <summary><i className="ti ti-file-analytics"></i> View Structured Verification Audit Report & Audit Payload</summary>
          <div className="report-inspector-body">
            
            {/* 1. Audit Metadata & Timestamps */}
            <div className="inspector-header">
              <div className="inspector-meta-row">
                <span className="inspector-label"><i className="ti ti-user"></i> Candidate Name <span className="plain-key-label">{plainLanguageLabels.candidate_name}</span>:</span>
                <span className="inspector-val">{data.candidate_name || 'Candidate Profile'}</span>
              </div>
              {data.timestamp && (
                <div className="inspector-meta-row">
                  <span className="inspector-label"><i className="ti ti-clock"></i> Timestamp <span className="plain-key-label">{plainLanguageLabels.timestamp}</span>:</span>
                  <span className="inspector-val">{new Date(data.timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* 2. Credibility Metrics Breakdown with Plain Language Descriptions */}
            {data.credibility_score && typeof data.credibility_score === 'object' && (
              <div className="inspector-section">
                <h6 className="inspector-subtitle"><i className="ti ti-chart-bar"></i> Credibility Correlation Breakdown</h6>
                <div className="metrics-grid">
                  <div className="metric-box">
                    <span className="metric-value text-blue">{data.credibility_score.resume_consistency ?? '80'}%</span>
                    <span className="metric-label">{plainLanguageLabels.resume_consistency}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-value text-emerald">{data.credibility_score.skill_verification ?? '0'}%</span>
                    <span className="metric-label">{plainLanguageLabels.skill_verification}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-value text-purple">{data.credibility_score.project_verification ?? '0'}%</span>
                    <span className="metric-label">{plainLanguageLabels.project_verification}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-value text-amber">{data.credibility_score.profile_evidence_strength ?? '0'}%</span>
                    <span className="metric-label">{plainLanguageLabels.profile_evidence_strength}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Comprehensive Skills Verification Matrix */}
            <div className="inspector-section">
              <h6 className="inspector-subtitle"><i className="ti ti-table"></i> Complete Skill Verification Matrix</h6>
              <div className="recruiter-table-wrapper">
                <table className="recruiter-data-table">
                  <thead>
                    <tr>
                      <th>Skill Claim</th>
                      <th>Status <span className="plain-key-label">{plainLanguageLabels.verification_status}</span></th>
                      <th>Confidence <span className="plain-key-label">{plainLanguageLabels.confidence_score}</span></th>
                      <th>Proof Sources <span className="plain-key-label">{plainLanguageLabels.supporting_sources}</span></th>
                      <th>Finding Reasoning <span className="plain-key-label">{plainLanguageLabels.reasoning}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...verifiedSkills, ...partiallyVerifiedSkills, ...unverifiedSkills].map((item, idx) => {
                      const name = typeof item === 'string' ? item : item.skill;
                      const status = typeof item === 'object' ? item.verification_status || 'unverified' : 'unverified';
                      const conf = typeof item === 'object' ? item.confidence_score ?? 'N/A' : 'N/A';
                      const sources = typeof item === 'object' ? (item.supporting_sources || item.sources || []).join(', ') || 'None' : 'None';
                      const reason = typeof item === 'object' ? item.reasoning || '-' : '-';

                      return (
                        <tr key={idx}>
                          <td className="font-semibold">{name}</td>
                          <td>
                            <span className={`status-pill status-${status}`}>
                              {status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{conf !== 'N/A' ? `${conf}%` : 'N/A'}</td>
                          <td>{sources}</td>
                          <td className="text-muted">{reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Verified Projects Audit */}
            {verifiedProjects.length > 0 && (
              <div className="inspector-section">
                <h6 className="inspector-subtitle"><i className="ti ti-folders"></i> Project Verification Audit</h6>
                <div className="recruiter-table-wrapper">
                  <table className="recruiter-data-table">
                    <thead>
                      <tr>
                        <th>Project Claim</th>
                        <th>Status <span className="plain-key-label">{plainLanguageLabels.verification_status}</span></th>
                        <th>Confidence <span className="plain-key-label">{plainLanguageLabels.confidence_score}</span></th>
                        <th>Proof Sources <span className="plain-key-label">{plainLanguageLabels.supporting_sources}</span></th>
                        <th>Reasoning <span className="plain-key-label">{plainLanguageLabels.reasoning}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedProjects.map((p, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold">{p.project_name || p.name}</td>
                          <td>
                            <span className={`status-pill status-${p.verification_status || 'verified'}`}>
                              {(p.verification_status || 'verified').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{p.confidence_score !== undefined ? `${p.confidence_score}%` : 'N/A'}</td>
                          <td>{(p.supporting_sources || p.sources || []).join(', ') || 'None'}</td>
                          <td className="text-muted">{p.reasoning || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Verified Certifications Audit */}
            {verifiedCerts.length > 0 && (
              <div className="inspector-section">
                <h6 className="inspector-subtitle"><i className="ti ti-certificate"></i> Certification Verification Audit</h6>
                <div className="recruiter-table-wrapper">
                  <table className="recruiter-data-table">
                    <thead>
                      <tr>
                        <th>Certification Claim</th>
                        <th>Status <span className="plain-key-label">{plainLanguageLabels.verification_status}</span></th>
                        <th>Confidence <span className="plain-key-label">{plainLanguageLabels.confidence_score}</span></th>
                        <th>Sources</th>
                        <th>Reasoning <span className="plain-key-label">{plainLanguageLabels.reasoning}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedCerts.map((c, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold">{c.certification || c.name || c}</td>
                          <td>
                            <span className={`status-pill status-${c.verification_status || 'partially_verified'}`}>
                              {(c.verification_status || 'partially_verified').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{c.confidence_score !== undefined ? `${c.confidence_score}%` : '30%'}</td>
                          <td>{(c.supporting_sources || ['resume']).join(', ')}</td>
                          <td className="text-muted">{c.reasoning || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Formatted Audit File Payload Structure Tree (Replaces raw JSON syntax view) */}
            <details className="nested-raw-json mt-16">
              <summary><i className="ti ti-sitemap"></i> View Audit File Data Structure Tree (Structured Visual Property Tree)</summary>
              <StructuredPayloadGrid payload={data} />
            </details>
          </div>
        </details>
      </div>
    );
  };

  const renderAgent3Output = (data) => {
    if (!data) return null;
    const strengthScore = data.candidate_strength_score ?? 0;
    const summaryText = data.recruiter_summary || '';
    const hiddenSkills = data.hidden_skills || [];
    const aiUsage = data.ai_usage_estimation || {};
    const topStrengths = data.top_strengths || [];
    const domainExpertise = data.domain_expertise || [];
    const recommendedRoles = data.recommended_roles || [];

    return (
      <div className="agent-result-card">
        <div className="agent-card-header">
          <div className="agent-title-group">
            <i className="ti ti-bulb agent-icon icon-amber"></i>
            <div>
              <h4 className="agent-name">Agent 3: Hidden Skill Discovery</h4>
              <p className="agent-subtitle">Discovers unlisted competencies, domain focus, and AI assistance metrics</p>
            </div>
          </div>
          <div className={`score-badge ${strengthScore >= 75 ? 'score-high' : strengthScore >= 50 ? 'score-mid' : 'score-low'}`}>
            <span className="score-num">{strengthScore}%</span>
            <span className="score-label">Strength Score</span>
          </div>
        </div>

        {/* Recruiter Summary Pitch */}
        {summaryText && (
          <div className="recruiter-pitch-banner">
            <i className="ti ti-file-text pitch-icon"></i>
            <div>
              <span className="pitch-heading">Recruiter Insights Summary</span>
              <p className="pitch-text">{summaryText}</p>
            </div>
          </div>
        )}

        {/* Hidden Skills Grid */}
        {hiddenSkills.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-sparkles"></i> Discovered & Inferred Hidden Skills ({hiddenSkills.length})</h5>
            <div className="hidden-skills-grid">
              {hiddenSkills.map((hs, idx) => (
                <div key={idx} className="hidden-skill-card">
                  <div className="hidden-skill-header">
                    <span className="hidden-skill-name">{hs.skill}</span>
                    {hs.confidence && <span className="tag-pill tag-purple-outline">Conf: {hs.confidence}</span>}
                  </div>
                  {hs.category && <span className="badge-category">{hs.category}</span>}
                  {hs.evidence && <p className="hidden-skill-evidence"><i className="ti ti-search"></i> {hs.evidence}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Usage & Domain Expertise Grid */}
        <div className="two-col-grid">
          {/* AI Usage Card */}
          <div className="info-card">
            <h5 className="info-card-title"><i className="ti ti-robot"></i> AI Assistance Estimation</h5>
            <div className="ai-level-badge">
              <span className="label">Estimated AI Reliance:</span>
              <span className="value">{aiUsage.ai_assistance_level || 'Low / Authentic'}</span>
            </div>
            {aiUsage.reasoning && <p className="info-card-desc">{aiUsage.reasoning}</p>}
          </div>

          {/* Strengths & Expertise */}
          <div className="info-card">
            <h5 className="info-card-title"><i className="ti ti-trending-up"></i> Top Strengths & Expertise</h5>
            {topStrengths.length > 0 && (
              <div className="tag-pills mb-8">
                {topStrengths.map((st, i) => <span key={i} className="tag-pill tag-emerald">{st}</span>)}
              </div>
            )}
            {domainExpertise.length > 0 && (
              <div>
                <span className="sublabel">Domains:</span>
                <div className="tag-pills mt-4">
                  {domainExpertise.map((de, i) => <span key={i} className="tag-pill tag-blue">{typeof de === 'string' ? de : de.domain}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Roles */}
        {recommendedRoles.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-briefcase"></i> Inferred Target Roles</h5>
            <div className="tag-pills">
              {recommendedRoles.map((r, i) => (
                <span key={i} className="tag-pill tag-indigo-lg">
                  <i className="ti ti-check"></i> {typeof r === 'string' ? r : `${r.role || r.role_title} (${r.match_percentage || r.match_score || 90}%)`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Formatted Agent 3 Output Data Structure Tree */}
        <details className="raw-json-details">
          <summary><i className="ti ti-sitemap"></i> View Agent 3 Output Data Structure Tree</summary>
          <StructuredPayloadGrid payload={data} />
        </details>
      </div>
    );
  };

  const renderAgent4Output = (data) => {
    if (!data) return null;
    const candidateName = data.candidate_name || name || 'Candidate';
    const strengthScore = data.overall_strength_score ?? 0;
    const recruiterAction = data.recruiter_action || 'Add to talent pool';
    const archetype = data.candidate_archetype || 'Software Engineer';
    const careerStage = data.career_stage || 'Professional';
    const pitch = data.one_line_pitch || '';
    const domainFit = data.domain_best_fit || '';
    const topRoles = data.top_recommended_roles || [];

    const getActionBadgeClass = (act) => {
      const a = (act || '').toLowerCase();
      if (a.includes('fast-track') || a.includes('interview')) return 'action-fast-track';
      if (a.includes('talent pool')) return 'action-pool';
      return 'action-revisit';
    };

    return (
      <div className="agent-result-card border-accent-glow">
        <div className="agent-card-header">
          <div className="agent-title-group">
            <i className="ti ti-target-arrow agent-icon icon-purple"></i>
            <div>
              <h4 className="agent-name">Agent 4: Best Role Finder & Recommendation Engine</h4>
              <p className="agent-subtitle">Matches candidate profile against industry roles and generates actionable recruiter recommendations</p>
            </div>
          </div>
          <div className={`score-badge ${strengthScore >= 75 ? 'score-high' : strengthScore >= 50 ? 'score-mid' : 'score-low'}`}>
            <span className="score-num">{strengthScore}%</span>
            <span className="score-label">Overall Match</span>
          </div>
        </div>

        {/* Candidate Profile Meta Banner */}
        <div className="archetype-banner">
          <div className="archetype-info">
            <span className="archetype-title">{candidateName}</span>
            <div className="meta-pills">
              <span className="tag-pill tag-purple-filled"><i className="ti ti-user-check"></i> {archetype}</span>
              <span className="tag-pill tag-neutral"><i className="ti ti-chart-dots"></i> {careerStage}</span>
              {domainFit && <span className="tag-pill tag-blue"><i className="ti ti-world"></i> {domainFit}</span>}
            </div>
          </div>
          <div className={`recruiter-action-pill ${getActionBadgeClass(recruiterAction)}`}>
            <i className="ti ti-player-play-filled"></i> {recruiterAction}
          </div>
        </div>

        {/* Pitch Banner */}
        {pitch && (
          <div className="one-line-pitch-card">
            <i className="ti ti-quote pitch-quote-icon"></i>
            <p className="pitch-body">"{pitch}"</p>
          </div>
        )}

        {/* Top 3 Recommended Roles */}
        {topRoles.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-award"></i> Top Recommended Roles for Hiring</h5>
            <div className="recommended-roles-grid">
              {topRoles.map((role, idx) => (
                <div key={idx} className="role-recommendation-card">
                  <div className="role-card-header">
                    <span className="role-rank-badge">#{role.rank || idx + 1}</span>
                    <div className="role-title-box">
                      <h6 className="role-title">{role.role_title || role.title}</h6>
                      <span className="match-score-text">{role.match_score || role.score || 90}% Match</span>
                    </div>
                  </div>

                  {/* Why This Role */}
                  {role.why_this_role && (
                    <div className="role-section-box">
                      <span className="box-label"><i className="ti ti-help-circle"></i> Why This Role:</span>
                      <p className="box-text">{role.why_this_role}</p>
                    </div>
                  )}

                  {/* Supporting Evidence List */}
                  {role.supporting_evidence && role.supporting_evidence.length > 0 && (
                    <div className="role-section-box">
                      <span className="box-label"><i className="ti ti-list-check"></i> Supporting Evidence:</span>
                      <ul className="recruiter-bullet-list">
                        {role.supporting_evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Growth Path */}
                  {role.growth_path && (
                    <div className="role-section-box border-top-dashed">
                      <span className="box-label text-indigo"><i className="ti ti-trending-up"></i> Growth Path:</span>
                      <p className="box-text text-indigo">{role.growth_path}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formatted Agent 4 Output Data Structure Tree */}
        <details className="raw-json-details">
          <summary><i className="ti ti-sitemap"></i> View Agent 4 Output Data Structure Tree</summary>
          <StructuredPayloadGrid payload={data} />
        </details>
      </div>
    );
  };

  const renderAgent5Output = (data) => {
    if (!data) return null;
    const score = data.overall_authenticity_score ?? 0;
    const verdict = data.verdict || 'Authentic';
    const verdictLevel = data.verdict_level || 'Mostly Authentic';
    const projects = data.projects || [];
    const conflicts = data.cross_agent_conflicts || [];
    const skillClaimAcc = data.skill_claim_accuracy ?? 80;
    const consistencyScore = data.profile_consistency_score ?? 85;
    const recAlert = data.recruiter_alert || '';
    const recSummary = data.recruiter_summary || '';

    return (
      <div className="agent-result-card border-accent-glow">
        <div className="agent-card-header">
          <div className="agent-title-group">
            <i className="ti ti-shield-lock agent-icon icon-emerald"></i>
            <div>
              <h4 className="agent-name">Agent 5: Project Authenticity System</h4>
              <p className="agent-subtitle">Cross-verifies claims, detects AI involvement, and evaluates project commit proof</p>
            </div>
          </div>
          <div className={`score-badge ${score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low'}`}>
            <span className="score-num">{score}%</span>
            <span className="score-label">{verdictLevel}</span>
          </div>
        </div>

        {/* Executive Summary Pitch */}
        {recSummary && (
          <div className="recruiter-pitch-banner">
            <i className="ti ti-checkup-list pitch-icon"></i>
            <div>
              <span className="pitch-heading">Authenticity Verdict: {verdict}</span>
              <p className="pitch-text">{recSummary}</p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-value text-emerald">{score}%</span>
            <span className="metric-label"><i className="ti ti-shield-check"></i> Overall Authenticity</span>
          </div>
          <div className="metric-box">
            <span className="metric-value text-indigo">{skillClaimAcc}%</span>
            <span className="metric-label"><i className="ti ti-target"></i> Skill Accuracy</span>
          </div>
          <div className="metric-box">
            <span className="metric-value text-purple">{consistencyScore}%</span>
            <span className="metric-label"><i className="ti ti-scale"></i> Consistency Score</span>
          </div>
        </div>

        {/* Recruiter Alert Banner */}
        {recAlert && (
          <div className="risk-flag-item mb-16">
            <span className="risk-severity-badge severity-high">RECRUITER ALERT</span>
            <div className="risk-flag-content">{recAlert}</div>
          </div>
        )}

        {/* Cross-Agent Conflicts */}
        {conflicts.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle text-rose">
              <i className="ti ti-alert-triangle"></i> Cross-Agent Discrepancies & Conflicts ({conflicts.length})
            </h5>
            <div className="risk-flags-list">
              {conflicts.map((conf, idx) => (
                <div key={idx} className="risk-flag-item">
                  <span className={`risk-severity-badge severity-${(conf.severity || 'medium').toLowerCase()}`}>
                    {(conf.severity || 'MEDIUM').toUpperCase()}
                  </span>
                  <div className="risk-flag-content">
                    <strong>{conf.conflict_type}:</strong> {conf.description} <em>({conf.agent_a} vs {conf.agent_b})</em>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Breakdown */}
        {projects.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-folder-check"></i> Project Authenticity Breakdown</h5>
            <div className="recommended-roles-grid">
              {projects.map((p, idx) => (
                <div key={idx} className="role-recommendation-card">
                  <div className="role-card-header">
                    <div className="role-title-box">
                      <h6 className="role-title">{p.project_name}</h6>
                      <span className="match-score-text">{p.final_verdict} ({p.authenticity_score}% Score)</span>
                    </div>
                  </div>

                  <div className="tag-pills">
                    <span className="tag-pill tag-purple">AI Level: {p.ai_assistance_level}</span>
                    <span className="tag-pill tag-neutral">Complexity: {p.complexity_match}</span>
                    <span className="tag-pill tag-emerald">Impact: {p.impact_score}/100</span>
                  </div>

                  {p.commit_evidence && (
                    <div className="role-section-box">
                      <span className="box-label"><i className="ti ti-git-commit"></i> Commit Evidence:</span>
                      <p className="box-text">{p.commit_evidence}</p>
                    </div>
                  )}

                  {p.green_flags && p.green_flags.length > 0 && (
                    <div className="tag-pills mt-4">
                      {p.green_flags.map((flag, i) => (
                        <span key={i} className="tag-pill tag-emerald-outline"><i className="ti ti-check"></i> {flag}</span>
                      ))}
                    </div>
                  )}

                  {p.red_flags && p.red_flags.length > 0 && (
                    <div className="tag-pills mt-4">
                      {p.red_flags.map((flag, i) => (
                        <span key={i} className="tag-pill tag-rose"><i className="ti ti-x"></i> {flag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formatted Agent 5 Output Data Structure Tree */}
        <details className="raw-json-details">
          <summary><i className="ti ti-sitemap"></i> View Agent 5 Output Data Structure Tree</summary>
          <StructuredPayloadGrid payload={data} />
        </details>
      </div>
    );
  };

  const renderAgent6Output = (data) => {
    if (!data) return null;
    const score = data.overall_technical_depth_score ?? 0;
    const skillsAssessed = data.skills_assessed || [];
    const strongest = data.strongest_technical_areas || [];
    const weakest = data.weakest_technical_areas || [];
    const pss = data.problem_solving_summary || {};
    const ir = data.interview_recommendation || {};
    const recSummary = data.recruiter_summary || '';

    return (
      <div className="agent-result-card border-accent-glow">
        <div className="agent-card-header">
          <div className="agent-title-group">
            <i className="ti ti-code-circle agent-icon icon-indigo"></i>
            <div>
              <h4 className="agent-name">Agent 6: Technical Depth Assessment</h4>
              <p className="agent-subtitle">Evaluates real problem-solving evidence from LeetCode & HackerRank versus resume claims</p>
            </div>
          </div>
          <div className={`score-badge ${score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low'}`}>
            <span className="score-num">{score}%</span>
            <span className="score-label">Tech Depth</span>
          </div>
        </div>

        {/* Summary Pitch */}
        {recSummary && (
          <div className="recruiter-pitch-banner">
            <i className="ti ti-brand-vscode pitch-icon"></i>
            <div>
              <span className="pitch-heading">Recruiter Technical Assessment</span>
              <p className="pitch-text">{recSummary}</p>
            </div>
          </div>
        )}

        {/* Problem Solving Metrics */}
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-value text-indigo">{pss.total_problems_solved ?? 0}</span>
            <span className="metric-label"><i className="ti ti-check"></i> Total Solved</span>
          </div>
          <div className="metric-box">
            <span className="metric-value text-purple">{pss.consistency_rating || 'N/A'}</span>
            <span className="metric-label"><i className="ti ti-chart-histogram"></i> Consistency</span>
          </div>
          <div className="metric-box">
            <span className="metric-value text-emerald">{score}%</span>
            <span className="metric-label"><i className="ti ti-award"></i> Depth Index</span>
          </div>
        </div>

        {/* Strongest vs Weakest Grid */}
        {(strongest.length > 0 || weakest.length > 0) && (
          <div className="two-col-grid">
            {strongest.length > 0 && (
              <div className="info-card">
                <h5 className="info-card-title text-emerald"><i className="ti ti-trending-up"></i> Strongest Technical Areas</h5>
                <div className="tag-pills">
                  {strongest.map((s, i) => <span key={i} className="tag-pill tag-emerald">{s}</span>)}
                </div>
              </div>
            )}

            {weakest.length > 0 && (
              <div className="info-card">
                <h5 className="info-card-title text-rose"><i className="ti ti-trending-down"></i> Weakest / Unverified Areas</h5>
                <div className="tag-pills">
                  {weakest.map((w, i) => <span key={i} className="tag-pill tag-rose">{w}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interview Recommendations */}
        {ir && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-chalkboard"></i> Interview Recommendation Strategy</h5>
            <div className="one-line-pitch-card">
              <i className="ti ti-user-check pitch-quote-icon"></i>
              <div>
                <span className="box-label text-purple">Suggested Round: {ir.suggested_round_type || 'Technical Coding'}</span>
                {ir.topics_to_test && ir.topics_to_test.length > 0 && (
                  <div className="mt-4">
                    <strong className="text-emerald">Topics to Test:</strong> {ir.topics_to_test.join(', ')}
                  </div>
                )}
                {ir.topics_to_avoid_assuming && ir.topics_to_avoid_assuming.length > 0 && (
                  <div className="mt-4">
                    <strong className="text-rose">Avoid Assuming:</strong> {ir.topics_to_avoid_assuming.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Skills Assessed List */}
        {skillsAssessed.length > 0 && (
          <div className="agent-section-block">
            <h5 className="section-subtitle"><i className="ti ti-list-check"></i> Per-Skill Depth & Gap Analysis ({skillsAssessed.length})</h5>
            <div className="recruiter-grid-list">
              {skillsAssessed.map((sk, idx) => (
                <div key={idx} className={`verified-item-card ${sk.level_gap_detected ? 'border-rose' : 'border-emerald'}`}>
                  <div className="item-title-row">
                    <span className="item-title">{sk.skill}</span>
                    <span className={`badge-small ${sk.level_gap_detected ? 'bg-rose' : 'bg-emerald'}`}>
                      {sk.interview_readiness || 'Ready'}
                    </span>
                  </div>

                  <div className="tag-pills mt-4">
                    <span className="tag-pill tag-neutral">Claimed: {sk.claimed_level}</span>
                    <span className={`tag-pill ${sk.level_gap_detected ? 'tag-rose' : 'tag-emerald'}`}>
                      Evidenced: {sk.evidenced_level}
                    </span>
                  </div>

                  {sk.level_gap_detected && sk.gap_explanation && (
                    <p className="item-reasoning text-rose"><i className="ti ti-alert-circle"></i> {sk.gap_explanation}</p>
                  )}

                  {sk.recommended_interview_focus && (
                    <p className="item-reasoning"><strong>Focus:</strong> {sk.recommended_interview_focus}</p>
                  )}

                  {sk.problem_solving_evidence && (
                    <details className="raw-json-details">
                      <summary>Platform Evidence ({sk.problem_solving_evidence.platform || 'Platform'})</summary>
                      <div className="item-reasoning mt-4">
                        <span>Easy: {sk.problem_solving_evidence.easy_solved ?? 0}</span> | 
                        <span> Medium: {sk.problem_solving_evidence.medium_solved ?? 0}</span> | 
                        <span> Hard: {sk.problem_solving_evidence.hard_solved ?? 0}</span>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formatted Agent 6 Output Data Structure Tree */}
        <details className="raw-json-details">
          <summary><i className="ti ti-sitemap"></i> View Agent 6 Output Data Structure Tree</summary>
          <StructuredPayloadGrid payload={data} />
        </details>
      </div>
    );
  };

  return (
    <div className="app">
      <div className="agent-badge">Agent 1 · Resume Parser</div>
      
      {!enrichedProfile ? (
        <div className="upload-section">
          <div className="form-header">
            <h1>Resume Parser</h1>
            <p className="subtitle">Upload your resume and fill in your details to generate an enriched profile</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleProcess(); }} noValidate className="resume-form">
            {/* User Details Grid */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  Full Name <span className="required" aria-hidden="true">*</span>
                </label>
                <div className="input-wrapper">
                  <i className="ti ti-user input-icon" aria-hidden="true"></i>
                  <input
                    id="fullName"
                    type="text"
                    className={`form-input ${errors.name && touched.name ? 'input-error' : ''}`}
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                    }}
                    onBlur={() => handleBlur('name')}
                    disabled={isProcessing}
                    aria-required="true"
                    aria-invalid={!!(errors.name && touched.name)}
                    aria-describedby={errors.name && touched.name ? "name-error" : undefined}
                  />
                </div>
                {errors.name && touched.name && (
                  <span id="name-error" className="error-message" role="alert">
                    <i className="ti ti-alert-circle" aria-hidden="true"></i> {errors.name}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="emailAddress" className="form-label">
                  Email Address <span className="required" aria-hidden="true">*</span>
                </label>
                <div className="input-wrapper">
                  <i className="ti ti-mail input-icon" aria-hidden="true"></i>
                  <input
                    id="emailAddress"
                    type="email"
                    className={`form-input ${errors.email && touched.email ? 'input-error' : ''}`}
                    placeholder="e.g. alex@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                    }}
                    onBlur={() => handleBlur('email')}
                    disabled={isProcessing}
                    aria-required="true"
                    aria-invalid={!!(errors.email && touched.email)}
                    aria-describedby={errors.email && touched.email ? "email-error" : undefined}
                  />
                </div>
                {errors.email && touched.email && (
                  <span id="email-error" className="error-message" role="alert">
                    <i className="ti ti-alert-circle" aria-hidden="true"></i> {errors.email}
                  </span>
                )}
              </div>
            </div>
            
            {/* Resume Upload */}
            <div className="form-group">
              <label htmlFor="resumeFileInput" className="form-label">
                Upload Resume <span className="required" aria-hidden="true">*</span>
              </label>

              {!file ? (
                <div
                  className={`upload-zone ${isDraggingOver ? 'dragging' : ''} ${errors.file && touched.file ? 'upload-zone-error' : ''} ${isProcessing ? 'processing' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  tabIndex={isProcessing ? -1 : 0}
                  role="button"
                  aria-label="Upload resume file dropzone"
                >
                  <input
                    id="resumeFileInput"
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isProcessing}
                  />
                  <div className="upload-icon-wrapper">
                    <i className={`ti ${isDraggingOver ? 'ti-cloud-upload' : 'ti-file-upload'}`}></i>
                  </div>
                  <div className="upload-text-group">
                    <p className="upload-title">
                      {isDraggingOver ? 'Drop your resume here' : 'Drag & drop your resume here, or click to browse'}
                    </p>
                    <span className="file-types">Supports PDF, PNG, JPG (Max 10MB)</span>
                  </div>
                </div>
              ) : (
                <div className="selected-file-card">
                  <div className="file-icon-badge">
                    <i className={`ti ${getFileIcon(file)}`}></i>
                  </div>
                  <div className="file-details">
                    <div className="file-header-row">
                      <span className="file-name">{file.name}</span>
                      <span className="file-status-badge">
                        <i className="ti ti-circle-check"></i> Ready
                      </span>
                    </div>
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="file-dot">•</span>
                      <span className="file-extension">{(file.name.split('.').pop() || '').toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      type="button"
                      className="btn-action-secondary"
                      onClick={() => !isProcessing && fileInputRef.current?.click()}
                      disabled={isProcessing}
                      title="Replace resume file"
                      aria-label="Replace resume file"
                    >
                      <i className="ti ti-refresh"></i> Replace
                    </button>
                    <button
                      type="button"
                      className="btn-action-danger"
                      onClick={() => {
                        if (!isProcessing) {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          handleBlur('file');
                        }
                      }}
                      disabled={isProcessing}
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                    <input
                      id="resumeFileInput"
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              )}
              {errors.file && touched.file && (
                <span id="resume-error" className="error-message" role="alert">
                  <i className="ti ti-alert-circle" aria-hidden="true"></i> {errors.file}
                </span>
              )}
            </div>

            {/* Pre-populated & Custom URLs */}
            <div className="form-group links-group">
              <div className="links-header">
                <label className="form-label mb-0">Links & Profiles</label>
                <span className="optional-badge">Optional</span>
              </div>
              
              <div className="url-inputs-list">
                <div className="url-input-row">
                  <div className="url-icon-badge">
                    <i className="ti ti-brand-github url-icon"></i>
                  </div>
                  <input
                    type="url"
                    className="url-input"
                    placeholder="https://github.com/yourusername"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    disabled={isProcessing}
                    aria-label="GitHub URL"
                  />
                </div>

                <div className="url-input-row">
                  <div className="url-icon-badge">
                    <i className="ti ti-brand-linkedin url-icon"></i>
                  </div>
                  <input
                    type="url"
                    className="url-input"
                    placeholder="https://linkedin.com/in/yourusername"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    disabled={isProcessing}
                    aria-label="LinkedIn URL"
                  />
                </div>

                <div className="url-input-row">
                  <div className="url-icon-badge">
                    <i className="ti ti-world url-icon"></i>
                  </div>
                  <input
                    type="url"
                    className="url-input"
                    placeholder="https://yourportfolio.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    disabled={isProcessing}
                    aria-label="Portfolio URL"
                  />
                </div>

                {/* Custom URLs with animation */}
                {customUrls.map((cu) => (
                  <div key={cu.id} className="custom-url-row custom-url-row-enter">
                    <input
                      type="text"
                      className="form-input custom-url-name"
                      placeholder="Label (e.g. Portfolio / Blog)"
                      value={cu.name}
                      onChange={(e) => updateCustomUrl(cu.id, 'name', e.target.value)}
                      disabled={isProcessing}
                      aria-label="Custom Link Label"
                    />
                    <input
                      type="url"
                      className="form-input custom-url-link"
                      placeholder="https://..."
                      value={cu.url}
                      onChange={(e) => updateCustomUrl(cu.id, 'url', e.target.value)}
                      disabled={isProcessing}
                      aria-label="Custom Link URL"
                    />
                    <button
                      type="button"
                      className="remove-url-btn"
                      onClick={() => removeCustomUrl(cu.id)}
                      disabled={isProcessing}
                      title="Remove URL"
                      aria-label="Remove URL"
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-url-btn"
                onClick={addCustomUrl}
                disabled={isProcessing}
              >
                <i className="ti ti-plus"></i>
                <span>Add More URLs</span>
              </button>
            </div>

            {/* Submit Button Group */}
            <div className="button-group">
              <button 
                type="submit" 
                className={`process-btn ${isProcessing ? 'loading' : ''}`} 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <i className="ti ti-loader-2 spinner-icon"></i>
                    <span>Parsing Resume...</span>
                  </>
                ) : (
                  <>
                    <i className="ti ti-player-play btn-icon"></i>
                    <span>Parse Resume</span>
                  </>
                )}
              </button>
            </div>
          </form>

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
                {processedUrls.map((item) => renderUrlDataCard(item))}
              </div>
            ) : (
              <div className="status-badge skipped"><i className="ti ti-circle-x"></i> No URLs processed</div>
            )}
          </div>



          {/* Pipeline Section */}
          <div className="section">
            <h3 className="section-header"><i className="ti ti-route"></i> AI Enrichment Pipeline</h3>

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
                <button className="process-btn" onClick={() => handleRunPipeline()}>
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
                </div>

                {/* Agent 2 Results */}
                {pipelineState.results?.agent2 && renderAgent2Output(pipelineState.results.agent2.data)}

                {/* Agent 3 Results */}
                {pipelineState.results?.agent3 && renderAgent3Output(pipelineState.results.agent3.data)}

                {/* Agent 4 Results */}
                {pipelineState.results?.agent4 && renderAgent4Output(pipelineState.results.agent4.data)}

                {/* Agent 5 Results */}
                {pipelineState.results?.agent5 && renderAgent5Output(pipelineState.results.agent5.data)}

                {/* Agent 6 Results */}
                {pipelineState.results?.agent6 && renderAgent6Output(pipelineState.results.agent6.data)}
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
}

export default App;
