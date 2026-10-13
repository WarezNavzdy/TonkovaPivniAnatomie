const API_METHODS = "GET, POST, OPTIONS";
const API_HEADERS = "Authorization, Content-Type";
const MAX_BODY_BYTES = 16_384;
const MAX_SUGGESTIONS = 5_000;

function corsHeaders(origin, env) {
  const allowedOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const headers = {
    "Access-Control-Allow-Methods": API_METHODS,
    "Access-Control-Allow-Headers": API_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(body, status, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function decodeBase64Utf8(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function isValidSuggestion(value) {
  return value
    && typeof value.id === "string"
    && value.id.length > 0
    && value.id.length <= 100
    && typeof value.name === "string"
    && value.name.trim().length > 0
    && value.name.length <= 160
    && typeof value.address === "string"
    && value.address.length <= 300
    && Number.isFinite(value.lat)
    && value.lat >= -90
    && value.lat <= 90
    && Number.isFinite(value.lng)
    && value.lng >= -180
    && value.lng <= 180;
}

function matchesSecret(provided, expected) {
  if (!provided || !expected) return false;
  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);
  let difference = providedBytes.length ^ expectedBytes.length;
  const length = Math.max(providedBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index++) {
    difference |= (providedBytes[index] || 0) ^ (expectedBytes[index] || 0);
  }
  return difference === 0;
}

function githubHeaders(env) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function githubContentsUrl(env) {
  return `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${(env.GITHUB_FILE || "visit-suggestions.json").split("/").map(encodeURIComponent).join("/")}`;
}

async function loadSuggestions(env) {
  const response = await fetch(`${githubContentsUrl(env)}?ref=${encodeURIComponent(env.GITHUB_BRANCH || "main")}`, {
    headers: githubHeaders(env)
  });
  if (!response.ok) throw new Error(`GitHub read failed with HTTP ${response.status}`);

  const file = await response.json();
  const suggestions = JSON.parse(decodeBase64Utf8(file.content || ""));
  if (!Array.isArray(suggestions)) throw new Error("Suggestions file must contain a JSON array");
  return { suggestions, sha: file.sha };
}

async function saveSuggestions(env, suggestions, sha) {
  const response = await fetch(githubContentsUrl(env), {
    method: "PUT",
    headers: {
      ...githubHeaders(env),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Add visit suggestion",
      content: encodeBase64Utf8(`${JSON.stringify(suggestions, null, 2)}\n`),
      sha,
      branch: env.GITHUB_BRANCH || "main"
    })
  });
  return response;
}

async function handlePost(request, env, origin) {
  const ipAddress = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateLimit = await env.SUBMISSION_LIMITER.limit({ key: ipAddress });
  if (!rateLimit.success) {
    return jsonResponse({ error: "Příliš mnoho pokusů. Zkus to znovu za minutu." }, 429, origin, env);
  }

  const authorization = request.headers.get("Authorization") || "";
  const providedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!matchesSecret(providedSecret, env.SUBMISSION_PASSWORD)) {
    return jsonResponse({ error: "Nesprávný přístupový klíč." }, 401, origin, env);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Návrh je příliš velký." }, 413, origin, env);
  }

  let suggestion;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Návrh je příliš velký." }, 413, origin, env);
    }
    suggestion = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Tělo požadavku musí být platný JSON." }, 400, origin, env);
  }
  if (!isValidSuggestion(suggestion)) {
    return jsonResponse({ error: "Návrh musí obsahovat platné ID, název, adresu a souřadnice." }, 400, origin, env);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { suggestions, sha } = await loadSuggestions(env);
    if (suggestions.some(item => item.id === suggestion.id)) {
      return jsonResponse({ error: "Návrh s tímto ID už existuje." }, 409, origin, env);
    }
    if (suggestions.length >= MAX_SUGGESTIONS) {
      return jsonResponse({ error: "Fronta návrhů dosáhla limitu." }, 507, origin, env);
    }

    const response = await saveSuggestions(env, [suggestion, ...suggestions], sha);
    if (response.ok) {
      return jsonResponse({ success: true, suggestion }, 201, origin, env);
    }
    if (response.status !== 409 && response.status !== 422) {
      throw new Error(`GitHub write failed with HTTP ${response.status}`);
    }
  }

  return jsonResponse({ error: "Soubor se souběžně změnil. Zkus odeslání znovu." }, 409, origin, env);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (!headers["Access-Control-Allow-Origin"]) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers });
    }
    if (url.pathname !== "/api/submissions") {
      return jsonResponse({ error: "Endpoint neexistuje." }, 404, origin, env);
    }
    if (!headers["Access-Control-Allow-Origin"]) {
      return jsonResponse({ error: "Původ požadavku není povolen." }, 403, origin, env);
    }

    try {
      if (request.method === "GET") {
        const { suggestions } = await loadSuggestions(env);
        return jsonResponse(suggestions, 200, origin, env);
      }
      if (request.method === "POST") {
        return await handlePost(request, env, origin);
      }
      return jsonResponse({ error: "Metoda není povolená." }, 405, origin, env);
    } catch (error) {
      console.error("Submission API request failed:", error);
      return jsonResponse({ error: "Uložení návrhu se nezdařilo." }, 502, origin, env);
    }
  }
};
