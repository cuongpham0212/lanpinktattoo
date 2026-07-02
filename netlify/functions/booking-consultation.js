const { getStore } = require("@netlify/blobs");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-LanPink-Secret",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  const store = getStore({
    name: "lanpink-booking-leads",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN
  });

  const key = "booking-leads.json";

  if (event.httpMethod === "POST") {
    let data = {};
    try {
      data = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "Invalid JSON" });
    }

    const lead = {
      id: "booking_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      created_at: new Date().toISOString(),
      name: String(data.name || data.full_name || "").trim(),
      phone: cleanPhone(data.phone || data.phone_zalo),
      date: String(data.date || "").trim(),
      date_key: String(data.date_key || "").trim(),
      time: String(data.time || "").trim(),
      description: String(data.description || "").trim(),
      language: String(data.language || "vi").startsWith("en") ? "en" : "vi"
    };

    if (!lead.name || !lead.phone || !lead.date_key) {
      return json(400, { ok: false, error: "Missing name, phone or date" });
    }

    const old = (await store.get(key, { type: "json" })) || [];
    old.unshift(lead);
    await store.setJSON(key, old.slice(0, 500));

    return json(200, { ok: true, lead_id: lead.id });
  }

  if (event.httpMethod === "GET") {
    const secret = process.env.BOOKING_SYNC_SECRET || "";
    const given = event.headers["x-lanpink-secret"] || event.queryStringParameters?.secret || "";

    if (!secret || given !== secret) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const leads = (await store.get(key, { type: "json" })) || [];
    return json(200, { ok: true, leads });
  }

  return json(405, { ok: false, error: "Method not allowed" });
};
