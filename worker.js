/**
 * Cloudflare Worker — CORS-прокси для Яндекс.Директ API
 *
 * Деплой:
 * 1. Зайди на https://workers.cloudflare.com (бесплатно)
 * 2. Создай новый Worker, вставь этот код
 * 3. Скопируй URL воркера (например: https://direct-proxy.YOUR_NAME.workers.dev)
 * 4. Вставь этот URL в дашборд в поле "Proxy URL"
 */

const ALLOWED_ORIGINS = ["*"]; // Для продакшна укажи свой домен GitHub Pages

const YANDEX_API_BASE = "https://api.direct.yandex.com/json/v5";
const YANDEX_API_SANDBOX = "https://api-sandbox.direct.yandex.com/json/v5";

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(request),
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }

    try {
      const body = await request.json();
      const { endpoint, payload, token, sandbox = false } = body;

      if (!endpoint || !payload || !token) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: endpoint, payload, token" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(request) } }
        );
      }

      const base = sandbox ? YANDEX_API_SANDBOX : YANDEX_API_BASE;
      const url = `${base}/${endpoint}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${token}`,
          "Accept-Language": "ru",
          "Client-Login": payload.clientLogin || "",
        },
        body: JSON.stringify(payload.params),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }
  },
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
