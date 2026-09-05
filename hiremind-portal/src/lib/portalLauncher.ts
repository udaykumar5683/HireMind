/**
 * Browser-compliant launcher for external portal hosted at http://localhost:5173
 * Handles popup blocker avoidance, URL formatting validation, and reachability fallback checks.
 */

export interface LaunchPortalOptions {
  jobId?: string;
  userId?: string;
  targetUrl?: string;
  onError?: (message: string) => void;
}

export async function launchExternalResumePortal(options: LaunchPortalOptions = {}): Promise<boolean> {
  const targetBaseUrl = options.targetUrl || "http://localhost:5173";

  // 1. Validate URL formatting
  let validatedUrl: URL;
  try {
    validatedUrl = new URL(targetBaseUrl);
    if (options.jobId) validatedUrl.searchParams.set("jobId", options.jobId);
    if (options.userId) validatedUrl.searchParams.set("userId", options.userId);
  } catch (err) {
    const errorMsg = `Invalid portal target URL: ${targetBaseUrl}`;
    if (options.onError) options.onError(errorMsg);
    else alert(errorMsg);
    return false;
  }

  // 2. Security & popup blocker compliance:
  // MUST open window synchronously within click event loop to prevent browser popup blocking
  const newTab = window.open("about:blank", "_blank");

  if (!newTab) {
    const popupError = "Popup blocked by browser. Please allow popups for this site to open the external application portal.";
    if (options.onError) options.onError(popupError);
    else alert(popupError);
    return false;
  }

  // Set loading message in blank tab while checking reachability
  try {
    newTab.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connecting to Resume Parser Portal...</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; }
            .spinner { border: 3px solid rgba(255,255,255,0.1); border-left-color: #6366f1; border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>Connecting to Resume Parser Portal</h2>
            <p>Validating service availability at <code>${validatedUrl.origin}</code>...</p>
          </div>
        </body>
      </html>
    `);
  } catch (e) {
    // Ignore cross-origin issues if document write is blocked
  }

  // 3. Reachability validation
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Fetch HEAD/GET mode no-cors ping to verify port 5173 server is listening
    await fetch(validatedUrl.origin, {
      method: "GET",
      mode: "no-cors",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // 4. Reachable! Redirect tab to final target URL
    newTab.location.href = validatedUrl.toString();
    return true;
  } catch (reachErr) {
    // 5. Unreachable fallback error handling
    if (!newTab.closed) {
      newTab.close();
    }

    const fallbackMsg = `Unable to connect to external portal at ${validatedUrl.origin}. Please ensure the portal service is running and accessible on port 5173.`;
    if (options.onError) {
      options.onError(fallbackMsg);
    } else {
      alert(fallbackMsg);
    }
    return false;
  }
}
