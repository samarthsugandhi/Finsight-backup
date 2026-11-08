const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api";

let inMemoryAccessToken = null;

export function getToken() {
  return inMemoryAccessToken;
}

export function setToken(token) {
  inMemoryAccessToken = token || null;
  // Cleanup any legacy localStorage tokens if present
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("finsight_token");
    window.localStorage.removeItem("finsight_refresh_token");
  }
}

let refreshInFlight = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token.
 * De-duplicates concurrent callers so a burst of 401s only triggers one network call.
 */
export async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        setToken(data.accessToken);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Thin fetch wrapper: attaches the JWT, parses JSON, and throws a
 * consistent Error(message) on any non-2xx response so callers can
 * just try/catch instead of checking res.ok everywhere. On a 401 from
 * an expired access token, transparently refreshes once and retries.
 */
export async function apiFetch(path, { method = "GET", body, auth = true, _isRetry = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_isRetry && path !== "/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch(path, { method, body, auth, _isRetry: true });
    }
    // Refresh failed — the session really is over. Clear it so the UI
    // can redirect to login instead of retrying forever.
    setToken(null);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    if (data?.details) {
      error.details = data.details;
    }
    throw error;
  }

  return data;
}

export const api = {
  signup: (payload) => apiFetch("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiFetch("/auth/login", { method: "POST", body: payload, auth: false }),
  refresh: () => apiFetch("/auth/refresh", { method: "POST", auth: false }),
  logout: () => apiFetch("/auth/logout", { method: "POST", auth: false }),
  me: () => apiFetch("/auth/me"),
  updateProfile: (payload) => apiFetch("/auth/profile", { method: "PATCH", body: payload }),
  changePassword: (payload) => apiFetch("/auth/change-password", { method: "POST", body: payload }),

  categories: () => apiFetch("/categories"),
  addCategory: (payload) => apiFetch("/categories", { method: "POST", body: payload }),

  transactions: (params = "") => apiFetch(`/transactions${params}`),
  summary: (params = "") => apiFetch(`/transactions/summary${params}`),
  addTransaction: (payload) => apiFetch("/transactions", { method: "POST", body: payload }),
  updateTransaction: (id, payload) => apiFetch(`/transactions/${id}`, { method: "PATCH", body: payload }),
  deleteTransaction: (id) => apiFetch(`/transactions/${id}`, { method: "DELETE" }),
  getTransferCandidates: (id) => apiFetch(`/transactions/transfer-candidates/${id}`),
  linkTransfer: (payload) => apiFetch("/transactions/link-transfer", { method: "POST", body: payload }),
  unlinkTransfer: (payload) => apiFetch("/transactions/unlink-transfer", { method: "POST", body: payload }),


  budgets: (params = "") => apiFetch(`/budgets${params}`),
  addBudget: (payload) => apiFetch("/budgets", { method: "POST", body: payload }),
  deleteBudget: (id) => apiFetch(`/budgets/${id}`, { method: "DELETE" }),

  goals: () => apiFetch("/goals"),
  addGoal: (payload) => apiFetch("/goals", { method: "POST", body: payload }),
  updateGoal: (id, payload) => apiFetch(`/goals/${id}`, { method: "PATCH", body: payload }),
  deleteGoal: (id) => apiFetch(`/goals/${id}`, { method: "DELETE" }),
  availableSavings: () => apiFetch("/goals/available-savings"),
  allocateSavings: (allocations) => apiFetch("/goals/allocate", { method: "POST", body: { allocations } }),
  goalContributions: (id) => apiFetch(`/goals/${id}/contributions`),

  portfolio: () => apiFetch("/portfolio"),
  addHolding: (payload) => apiFetch("/portfolio", { method: "POST", body: payload }),
  updateHolding: (id, payload) => apiFetch(`/portfolio/${id}`, { method: "PATCH", body: payload }),
  deleteHolding: (id) => apiFetch(`/portfolio/${id}`, { method: "DELETE" }),
  addPortfolioTransaction: (holdingId, payload) =>
    apiFetch(`/portfolio/${holdingId}/transactions`, { method: "POST", body: payload }),
  portfolioTransactions: (holdingId) => apiFetch(`/portfolio/${holdingId}/transactions`),
  updateManualPrice: (holdingId, price) =>
    apiFetch(`/portfolio/${holdingId}/manual-price`, { method: "PATCH", body: { price } }),
  updateManualHolding: (holdingId, payload) =>
    apiFetch(`/portfolio/${holdingId}/manual-price`, { method: "PATCH", body: payload }),
  calculateRecommendation: (payload) =>
    apiFetch("/portfolio/recommendations/calculate", { method: "POST", body: payload }),
  getInvestmentOptions: (payload) =>
    apiFetch("/portfolio/recommendations/options", { method: "POST", body: payload }),
  calculateFD: (payload) =>
    apiFetch("/portfolio/fd-calculator", { method: "POST", body: payload }),
  getSavedRecommendation: () => apiFetch("/portfolio/recommendations"),
  saveRecommendation: (payload) =>
    apiFetch("/portfolio/recommendations/save", { method: "POST", body: payload }),
  compareRecommendation: (payload) =>
    apiFetch("/portfolio/recommendations/compare", { method: payload ? "POST" : "GET", body: payload }),
  uploadInvestmentStatement: (formData) => {
    const token = getToken();
    return fetch(`${API_BASE}/portfolio/upload-statement`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload investment statement");
      return data;
    });
  },
  portfolioMarketStatus: () => apiFetch("/portfolio/market-status"),
  portfolioAllocationTargets: () => apiFetch("/portfolio/allocation-targets"),
  setPortfolioAllocationTargets: (targets) =>
    apiFetch("/portfolio/allocation-targets", { method: "PUT", body: { targets } }),
  portfolioRealizedGains: (params = "") => apiFetch(`/portfolio/realized-gains${params}`),

  healthScore: (params = "") => apiFetch(`/health-score${params}`),
  askAdvisor: (payload) => apiFetch("/insights/ask", { method: "POST", body: payload }),

  aiChat: (payload) => apiFetch("/ai/chat", { method: "POST", body: payload }),
  executeAiAction: (payload) => apiFetch("/ai/execute-action", { method: "POST", body: payload }),
  aiTranscribe: (formData) => {
    const token = getToken();
    return fetch(`${API_BASE}/ai/transcribe`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status})`);
      return data;
    });
  },

  /**
   * Streaming version of aiChat — connects to the SSE endpoint and calls:
   *  - onChunk(text)  for each token emitted by Ollama
   *  - onDone()       when the stream finishes successfully
   *  - onError(err)   on network or server error
   *
   * Returns an AbortController so the caller can cancel early (e.g. on unmount).
   */
  aiChatStream(payload, { onChunk, onDone, onError }) {
    const ac = new AbortController();

    const token = getToken();

    fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          // Non-SSE error — parse JSON body for the error message
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Request failed (${res.status})`);
        }
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });

          // SSE lines look like: "data: <payload>\n\n"
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? ""; // keep trailing incomplete chunk

          for (const part of parts) {
            // Do NOT .trim() the whole part — that would eat leading spaces
            // that belong to the token text after "data: ".
            // Only strip a trailing \r that some SSE implementations append.
            const line = part.replace(/\r$/, "");
            if (!line.startsWith("data:")) continue;

            // Strip exactly one space after the colon (SSE spec: "data: <value>").
            // Do NOT call .trim() — it would silently swallow spaces that are
            // part of the LLM token (e.g. " world" after "Hello").
            const payload = line.startsWith("data: ") ? line.slice(6) : line.slice(5);

            if (payload === "[DONE]") {
              onDone?.();
              return;
            }

            if (payload.startsWith("[ERROR]")) {
              throw new Error(payload.slice(7).trim());
            }

            // Unescape the \n we encoded server-side
            const text = payload.replace(/\\n/g, "\n");
            onChunk?.(text);
          }
        }

        // Fallback in case [DONE] was never sent
        onDone?.();
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // intentional cancel — ignore
        onError?.(err);
      });

    return ac; // caller can call ac.abort() to cancel
  },


  statements: {
    upload: (formData) => {
      const token = getToken();
      return fetch(`${API_BASE}/statements/upload`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
        body: formData,
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload statement");
        return data;
      });
    },
    getReviewQueue: () => apiFetch("/statements/review-queue"),
    approveQueueItem: (id, payload) => apiFetch(`/statements/review-queue/${id}/approve`, { method: "POST", body: payload }),
    createRule: (payload) => apiFetch("/statements/rules", { method: "POST", body: payload }),
  },

  // ─── Reports Module ────────────────────────────────────────────────────────
  reportData: (params = "") => apiFetch(`/reports${params}`),

  /**
   * Downloads a PDF report for the given period. Returns the blob URL so callers
   * can trigger a browser download without persisting the file on the server.
   */
  async reportExportPdf(params = "") {
    const token = getToken();
    const res = await fetch(`${API_BASE}/reports/export/pdf${params}`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `PDF export failed (${res.status})`);
    }
    const blob = await res.blob();
    const filename = res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] || "finsight-report.pdf";
    return { blob, filename };
  },

  /**
   * Downloads a CSV export for the given period and content mode.
   */
  async reportExportCsv(params = "") {
    const token = getToken();
    const res = await fetch(`${API_BASE}/reports/export/csv${params}`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `CSV export failed (${res.status})`);
    }
    const blob = await res.blob();
    const filename = res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] || "finsight-report.csv";
    return { blob, filename };
  },
};


