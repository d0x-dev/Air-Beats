/**
 * AirBeats Full-Site Cloudflare Worker Backend & IP Rate Limiter
 * 
 * Features:
 * - Serves Static Assets (index.html, form.html, css, js) via Cloudflare env.ASSETS
 * - Intercepts POST /api/submit endpoint for IP Rate Limiting (5 msgs/hour per IP)
 * - Proxies submission to Web3Forms API
 */

const ipCache = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ─── 1. SUPPORT FORM SUBMISSION ROUTE (/api/submit) ───
    if (url.pathname === "/api/submit" || (request.method === "POST" && url.pathname.endsWith("/submit"))) {
      // Handle CORS Preflight OPTIONS Request
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Accept",
          },
        });
      }

      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ success: false, message: "Method not allowed. Use POST." }),
          {
            status: 405,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Extract Client IP from Cloudflare Request Headers
      const clientIP =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "127.0.0.1";

      const now = Date.now();

      // Retrieve Current IP Rate Limit Record
      let ipData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

      if (env && env.RATE_LIMIT_KV) {
        const kvVal = await env.RATE_LIMIT_KV.get(`ip:${clientIP}`, "json");
        if (kvVal) ipData = kvVal;
      } else if (ipCache.has(clientIP)) {
        ipData = ipCache.get(clientIP);
      }

      // Reset window if 1 hour has passed
      if (now > ipData.resetTime) {
        ipData.count = 0;
        ipData.resetTime = now + RATE_LIMIT_WINDOW_MS;
      }

      // Enforce 5 messages per hour per IP limit
      if (ipData.count >= RATE_LIMIT_MAX) {
        const remainingMinutes = Math.ceil((ipData.resetTime - now) / (60 * 1000));
        return new Response(
          JSON.stringify({
            success: false,
            message: `Rate limit exceeded. Maximum 5 messages per hour allowed per IP address. Please try again in ${remainingMinutes} minute(s).`,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      try {
        const bodyText = await request.text();
        let payload;
        try {
          payload = JSON.parse(bodyText);
        } catch (e) {
          return new Response(
            JSON.stringify({ success: false, message: "Invalid JSON payload." }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Attach Web3Forms Access Key
        payload.access_key = "359251f7-72a8-4d76-8b5e-b9b43bebb3a3";

        // Proxy payload to Web3Forms API
        const web3Response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseData = await web3Response.json();

        // Increment IP counter on successful response
        if (web3Response.ok && responseData.success) {
          ipData.count += 1;
          const ttlSeconds = Math.ceil((ipData.resetTime - now) / 1000);

          if (env && env.RATE_LIMIT_KV) {
            await env.RATE_LIMIT_KV.put(`ip:${clientIP}`, JSON.stringify(ipData), {
              expirationTtl: Math.max(ttlSeconds, 60),
            });
          } else {
            ipCache.set(clientIP, ipData);
          }
        }

        return new Response(JSON.stringify(responseData), {
          status: web3Response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Internal server error proxying request to Web3Forms API.",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // ─── 2. SERVE WEBSITE STATIC ASSETS (INDEX, FORM, CSS, JS) ───
    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return fetch(request);
  },
};
