const crypto = require("crypto");

const OWNER = "cuongpham0212";
const REPO = "lanpink-automation";
const WORKFLOW = "booking-calendar-update.yml";
const REF = "main";

const COOKIE_NAME = "lp_admin";
const SESSION_AGE = 60 * 60 * 24 * 30;


function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      ...headers
    },
    body
  };
}


function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function hash(value) {
  return crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest();
}


function safeEqual(a, b) {
  return crypto.timingSafeEqual(
    hash(a),
    hash(b)
  );
}


function sign(exp, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(exp))
    .digest("hex");
}


function makeSession(secret) {
  const exp =
    Math.floor(Date.now() / 1000)
    + SESSION_AGE;

  return `${exp}.${sign(exp, secret)}`;
}


function validSession(token, secret) {
  if (!token || !secret) return false;

  const match =
    /^(\d+)\.([a-f0-9]{64})$/i
      .exec(token);

  if (!match) return false;

  const exp = Number(match[1]);

  if (
    !Number.isFinite(exp)
    || exp <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  return safeEqual(
    match[2],
    sign(exp, secret)
  );
}


function getCookies(event) {
  const raw =
    event.headers?.cookie
    || "";

  const result = {};

  for (const part of raw.split(";")) {
    const pos = part.indexOf("=");

    if (pos <= 0) continue;

    result[
      part.slice(0, pos).trim()
    ] = part.slice(pos + 1).trim();
  }

  return result;
}


function parseBody(event) {
  const type =
    String(
      event.headers?.["content-type"]
      || ""
    ).toLowerCase();

  if (
    type.includes(
      "application/json"
    )
  ) {
    try {
      return JSON.parse(
        event.body || "{}"
      );
    } catch {
      return {};
    }
  }

  return Object.fromEntries(
    new URLSearchParams(
      event.body || ""
    ).entries()
  );
}


function shell(content) {
  return `<!doctype html>
<html lang="vi">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<meta
  name="robots"
  content="noindex,nofollow,noarchive"
>

<title>LanPink Admin</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 22px 14px 48px;
  background: #fff7fb;
  color: #33232b;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.card {
  max-width: 520px;
  margin: 0 auto;
  padding: 20px;

  background: #fff;

  border:
    1px solid #f0c8da;

  border-radius: 22px;

  box-shadow:
    0 10px 30px
    rgba(107,48,64,.08);
}

h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.sub {
  margin: 0 0 18px;
  color: #765c68;
}

label {
  display: block;
  margin: 15px 0 7px;
  font-weight: 700;
}

input {
  width: 100%;
  padding: 14px;

  font: inherit;
  font-size: 17px;

  border:
    1px solid #dac8d1;

  border-radius: 14px;
}

.row {
  display: grid;
  grid-template-columns:
    1fr 1fr;

  gap: 10px;
  margin-top: 18px;
}

button {
  padding: 14px;

  border: 0;
  border-radius: 14px;

  font: inherit;
  font-weight: 800;
}

.pink {
  background: #df3c83;
  color: #fff;
}

.soft {
  background: #f2edf0;
  color: #45343d;
}

.quick {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.quick button {
  padding: 9px 12px;
  background: #f6edf2;
}

.msg {
  margin-bottom: 14px;
  padding: 12px;

  border-radius: 13px;

  background: #eef9f2;
  color: #23633a;
}

.err {
  background: #fff0f1;
  color: #9b2d39;
}

.small {
  margin-top: 7px;
  font-size: 13px;
  color: #806a75;
}

@media(max-width:420px) {
  .row {
    grid-template-columns: 1fr;
  }
}

</style>

</head>

<body>

${content}

</body>
</html>`;
}


function loginPage(error = "") {
  return shell(`

<div class="card">

  <h1>🌸 LANPINK ADMIN</h1>

  <p class="sub">
    Nhập mã Admin để mở booking nhanh.
  </p>

  ${
    error
      ? `<div class="msg err">${esc(error)}</div>`
      : ""
  }

  <form
    method="post"
    action="/admin"
  >

    <input
      type="hidden"
      name="action"
      value="login"
    >

    <label>
      Mã Admin
    </label>

    <input
      name="pin"
      type="password"
      inputmode="numeric"
      required
      autofocus
    >

    <div
      class="row"
      style="grid-template-columns:1fr"
    >

      <button class="pink">
        ĐĂNG NHẬP
      </button>

    </div>

  </form>

</div>

`);
}


function adminPage(
  message = "",
  error = ""
) {
  return shell(`

<div class="card">

  <h1>📅 LANPINK BOOK</h1>

  <p class="sub">
    Khóa hoặc mở một ngày
    trên lịch website.
  </p>

  ${
    message
      ? `<div class="msg">${esc(message)}</div>`
      : ""
  }

  ${
    error
      ? `<div class="msg err">${esc(error)}</div>`
      : ""
  }

  <form
    method="post"
    action="/admin"
  >

    <input
      type="hidden"
      name="action"
      value="booking"
    >

    <label>
      Ngày booking
    </label>

    <input
      id="date_key"
      name="date_key"
      type="date"
      required
    >

    <div class="quick">

      <button
        type="button"
        onclick="setDay(0)"
      >
        Hôm nay
      </button>

      <button
        type="button"
        onclick="setDay(1)"
      >
        Ngày mai
      </button>

    </div>

    <label>
      Ghi chú khách sẽ thấy
    </label>

    <input
      name="note"
      maxlength="180"
      placeholder="VD: Mai - 14:00"
    >

    <div class="small">
      Ghi chú này có thể hiển thị
      trên lịch public.
    </div>

    <div class="row">

      <button
        class="pink"
        name="operation"
        value="lock"
      >
        🔒 KHÓA LỊCH
      </button>

      <button
        class="soft"
        name="operation"
        value="open"
        onclick="
          return confirm(
            'Mở lại ngày này?'
          )
        "
      >
        🔓 MỞ LỊCH
      </button>

    </div>

  </form>

  <form
    method="post"
    action="/admin"
  >

    <input
      type="hidden"
      name="action"
      value="logout"
    >

    <button
      class="soft"
      style="
        width:100%;
        margin-top:12px
      "
    >
      Đăng xuất
    </button>

  </form>

</div>

<script>

function ymd(d) {
  return (
    d.getFullYear()
    + "-"
    + String(
        d.getMonth() + 1
      ).padStart(2, "0")
    + "-"
    + String(
        d.getDate()
      ).padStart(2, "0")
  );
}


function setDay(offset) {
  const d = new Date();

  d.setDate(
    d.getDate() + offset
  );

  document
    .getElementById(
      "date_key"
    )
    .value = ymd(d);
}


setDay(0);

</script>

`);
}


async function dispatchBooking(inputs) {
  const token =
    process.env
      .LANPINK_ADMIN_GITHUB_TOKEN
    || "";

  if (!token) {
    throw new Error(
      "Thiếu LANPINK_ADMIN_GITHUB_TOKEN."
    );
  }

  const url =
    `https://api.github.com/repos/${OWNER}/${REPO}`
    + `/actions/workflows/${WORKFLOW}/dispatches`;

  const res =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Accept":
            "application/vnd.github+json",

          "Authorization":
            `Bearer ${token}`,

          "Content-Type":
            "application/json",

          "X-GitHub-Api-Version":
            "2022-11-28",

          "User-Agent":
            "LanPinkAdmin/1.0"
        },

        body:
          JSON.stringify({
            ref: REF,
            inputs
          })
      }
    );

  if (!res.ok) {
    const body =
      await res.text();

    throw new Error(
      `GitHub HTTP ${res.status}: `
      + body.slice(0, 250)
    );
  }
}


exports.handler =
async function(event) {

  const pin =
    process.env
      .LANPINK_ADMIN_PIN
    || "";

  const sessionSecret =
    process.env
      .LANPINK_ADMIN_SESSION_SECRET
    || "";

  const cookie =
    getCookies(event)[
      COOKIE_NAME
    ];

  const authenticated =
    validSession(
      cookie,
      sessionSecret
    );


  if (
    event.httpMethod
    === "GET"
  ) {
    return response(
      200,
      authenticated
        ? adminPage()
        : loginPage()
    );
  }


  if (
    event.httpMethod
    !== "POST"
  ) {
    return response(
      405,
      loginPage(
        "Method not allowed"
      )
    );
  }


  const data =
    parseBody(event);

  const action =
    String(
      data.action || ""
    ).trim();


  if (
    action
    === "login"
  ) {

    if (
      !pin
      || !sessionSecret
    ) {
      return response(
        500,
        loginPage(
          "Admin chưa được cấu hình."
        )
      );
    }


    if (
      !safeEqual(
        data.pin || "",
        pin
      )
    ) {
      return response(
        401,
        loginPage(
          "Mã Admin không đúng."
        )
      );
    }


    const session =
      makeSession(
        sessionSecret
      );


    return {
      statusCode: 303,

      headers: {
        "Location":
          "/admin",

        "Cache-Control":
          "no-store",

        "Set-Cookie":
          `${COOKIE_NAME}=${session}; `
          + `Max-Age=${SESSION_AGE}; `
          + "Path=/; "
          + "HttpOnly; "
          + "Secure; "
          + "SameSite=Strict"
      },

      body: ""
    };
  }


  if (
    action
    === "logout"
  ) {

    return {
      statusCode: 303,

      headers: {
        "Location":
          "/admin",

        "Set-Cookie":
          `${COOKIE_NAME}=; `
          + "Max-Age=0; "
          + "Path=/; "
          + "HttpOnly; "
          + "Secure; "
          + "SameSite=Strict"
      },

      body: ""
    };
  }


  if (!authenticated) {
    return response(
      401,
      loginPage(
        "Phiên đăng nhập đã hết."
      )
    );
  }


  if (
    action
    !== "booking"
  ) {
    return response(
      400,
      adminPage(
        "",
        "Thao tác không hợp lệ."
      )
    );
  }


  const operation =
    String(
      data.operation || ""
    )
    .trim()
    .toLowerCase();


  const dateKey =
    String(
      data.date_key || ""
    ).trim();


  const note =
    String(
      data.note || ""
    )
    .trim()
    .slice(0, 180);


  if (
    ![
      "lock",
      "open"
    ].includes(operation)
  ) {
    return response(
      400,
      adminPage(
        "",
        "Chọn Khóa lịch hoặc Mở lịch."
      )
    );
  }


  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(dateKey)
  ) {
    return response(
      400,
      adminPage(
        "",
        "Ngày booking không hợp lệ."
      )
    );
  }


  try {

    await dispatchBooking({
      operation,

      date_key:
        dateKey,

      note,

      source:
        "manual_admin",

      lead_id:
        "",

      booking_calendar_json:
        "",

      commit_message:
        (
          operation
          === "lock"
            ? "Admin lock booking "
            : "Admin open booking "
        )
        + dateKey
    });


    return response(
      200,
      adminPage(
        (
          operation
          === "lock"
            ? "Đã gửi lệnh khóa lịch "
            : "Đã gửi lệnh mở lịch "
        )
        + dateKey
        + "."
      )
    );


  } catch (error) {

    console.error(
      "[LanPink Admin]",
      error
    );


    return response(
      502,
      adminPage(
        "",
        "Không gửi được cập nhật: "
        + String(
          error.message
          || error
        )
      )
    );
  }
};
