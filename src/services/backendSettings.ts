import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface BackendConfig {
  url: string;
  updatedAt?: string;
}

/**
 * 1. Fetch current configured Backend / OCR URL from Firestore settings/backend
 */
export const fetchBackendUrl = async (): Promise<string> => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'backend'));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.url && typeof data.url === 'string') {
        return data.url.trim();
      }
    }
  } catch (err) {
    console.error('Failed to fetch backend URL from Firestore:', err);
  }
  return '';
};

/**
 * 2. Save or update the global Backend / OCR URL in Firestore settings/backend
 */
export const saveBackendUrl = async (newUrl: string): Promise<string> => {
  const cleanUrl = newUrl.trim().replace(/\/+$/, ''); // Remove trailing slash
  const payload: BackendConfig = {
    url: cleanUrl,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'settings', 'backend'), payload, { merge: true });
  return cleanUrl;
};

/**
 * 3. Clear the global Backend / OCR URL in Firestore settings/backend
 */
export const clearBackendUrl = async (): Promise<void> => {
  await setDoc(doc(db, 'settings', 'backend'), { url: '', updatedAt: new Date().toISOString() });
  try {
    await deleteDoc(doc(db, 'settings', 'backend'));
  } catch (err) {
    console.warn('deleteDoc failed, set empty url fallback', err);
  }
};

/**
 * 4. Test connectivity with the backend server via /api/health
 */
export const testBackendHealth = async (
  url: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  if (!cleanUrl) {
    return { success: false, message: 'URL is empty' };
  }

  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const targetUrl = cleanUrl.endsWith('/api/health') ? cleanUrl : `${cleanUrl}/api/health`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      return {
        success: true,
        message: `Health endpoint responded: HTTP ${res.status} OK`,
        latencyMs,
      };
    }

    // If /api/health returned 404 (endpoint not defined), test FleetPro's /api/ocr endpoint
    if (res.status === 404) {
      try {
        const ocrController = new AbortController();
        const ocrTimeout = setTimeout(() => ocrController.abort(), 5000);

        const ocrRes = await fetch(`${cleanUrl}/api/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ping: true }),
          signal: ocrController.signal,
        });
        clearTimeout(ocrTimeout);

        const ocrLatency = Math.round(performance.now() - start);

        // Status 400 (e.g. "Image data is required") or 200 proves the OCR API route is running!
        if (ocrRes.status === 400 || ocrRes.ok) {
          return {
            success: true,
            message: `FleetPro OCR API is active and ready (HTTP ${ocrRes.status})`,
            latencyMs: ocrLatency,
          };
        }
      } catch {
        // Fallback to checking host root
      }

      // Check root URL
      try {
        const rootController = new AbortController();
        const rootTimeout = setTimeout(() => rootController.abort(), 4000);
        const rootRes = await fetch(cleanUrl, {
          method: 'GET',
          signal: rootController.signal,
        });
        clearTimeout(rootTimeout);
        if (rootRes.ok) {
          return {
            success: true,
            message: `Server host is active (HTTP ${rootRes.status})`,
            latencyMs: Math.round(performance.now() - start),
          };
        }
      } catch {
        // Ignore
      }
    }

    return {
      success: false,
      message: `Server returned HTTP ${res.status}: ${res.statusText || 'Endpoint not found'}`,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    if (err.name === 'AbortError') {
      return { success: false, message: 'Connection timed out (no response in 6 seconds)' };
    }
    return {
      success: false,
      message: err?.message || 'Failed to connect. Check if server is running and CORS is enabled.',
      latencyMs,
    };
  }
};
