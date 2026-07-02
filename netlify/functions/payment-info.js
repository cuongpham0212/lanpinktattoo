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

  const store = getStore("lanpink-payment-leads");
  const key = "payment-leads.json";

  if (event.httpMethod === "POST") {
    let data = {};
    try {
      data = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "Invalid JSON" });
    }

    const lead = {
      id: "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      created_at: new Date().toISOString(),
      full_name: String(data.full_name || "").trim(),
      birthday: String(data.birthday || "").trim(),
      email: String(data.email || "").trim(),
      phone_zalo: cleanPhone(data.phone_zalo),
      referral_phone: cleanPhone(data.referral_phone),
      language: String(data.language || "vi").startsWith("en") ? "en" : "vi"
    };

    if (!lead.full_name || !lead.phone_zalo) {
      return json(400, { ok: false, error: "Missing name or phone" });
    }

    const old = (await store.get(key, { type: "json" })) || [];
    old.unshift(lead);
    await store.setJSON(key, old.slice(0, 500));

    return json(200, { ok: true, lead_id: lead.id });
  }

  if (event.httpMethod === "GET") {
    const secret = process.env.PAYMENT_SYNC_SECRET || "";
    const given = event.headers["x-lanpink-secret"] || event.queryStringParameters?.secret || "";

    if (!secret || given !== secret) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const leads = (await store.get(key, { type: "json" })) || [];
    return json(200, { ok: true, leads });
  }

  return json(405, { ok: false, error: "Method not allowed" });
};
