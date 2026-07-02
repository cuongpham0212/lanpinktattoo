---
title: "Nhập Thông Tin Thanh Toán"
slug: "thong-tin-thanh-toan"
date: 2026-07-02
draft: false
description: "Nhập thông tin thanh toán một lần để Lan Pink Tattoo xuất hoá đơn, lưu hồ sơ thành viên và nhận voucher sinh nhật."
---

<style>
.lp-payment-form-wrap{max-width:760px;margin:24px auto;padding:22px;border:1px solid #eee;border-radius:18px;background:#fff}
.lp-payment-form-wrap h1{margin-top:0}
.lp-lang-switch{display:flex;gap:8px;margin:12px 0 20px}
.lp-lang-switch button{padding:8px 14px;border-radius:999px;border:1px solid #ddd;background:#fafafa;cursor:pointer}
.lp-lang-switch button.active{background:#111;color:#fff}
.lp-form-field{margin-bottom:16px}
.lp-form-field label{display:block;font-weight:700;margin-bottom:6px}
.lp-form-field input{width:100%;padding:12px 13px;border:1px solid #ddd;border-radius:12px;font-size:16px}
.lp-form-note{font-size:14px;line-height:1.65;color:#555;background:#fafafa;padding:14px;border-radius:14px;margin:16px 0}
.lp-form-note a{text-decoration:underline}
.lp-consent{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.55;margin:16px 0}
.lp-consent input{margin-top:4px}
.lp-submit{width:100%;padding:14px 18px;border:0;border-radius:999px;background:#111;color:#fff;font-weight:800;font-size:16px;cursor:pointer}
.lp-small{font-size:13px;color:#777;margin-top:10px}
.lp-hidden{display:none!important}
</style>

<div class="lp-payment-form-wrap" id="lpPaymentForm">
  <div class="lp-lang-switch">
    <button type="button" data-lang-btn="vi">Tiếng Việt</button>
    <button type="button" data-lang-btn="en">English</button>
  </div>

  <h1 data-i18n="title">Nhập thông tin thanh toán</h1>
  <p data-i18n="intro">Bạn chỉ cần nhập thông tin một lần. Những lần thanh toán sau, Lan Pink Tattoo có thể tra cứu bằng số điện thoại/Zalo để hỗ trợ nhanh hơn.</p>

  <form id="lp-payment-info-form" name="lanpink-payment-info">
    <input type="hidden" name="language" id="lp_payment_language" value="vi">
    <p class="lp-hidden">
      <label>Không điền ô này: <input name="bot-field"></label>
    </p>

    <div class="lp-form-field">
      <label for="full_name" data-i18n="fullName">Họ tên</label>
      <input id="full_name" name="full_name" type="text" autocomplete="name" required>
    </div>

    <div class="lp-form-field">
      <label for="birthday" data-i18n="birthday">Ngày sinh để nhận voucher sinh nhật</label>
      <input id="birthday" name="birthday" type="date" required>
    </div>

    <div class="lp-form-field">
      <label for="email" data-i18n="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="email">
    </div>

    <div class="lp-form-field">
      <label for="phone_zalo" data-i18n="phone">Số điện thoại/Zalo nhận hoá đơn thanh toán</label>
      <input id="phone_zalo" name="phone_zalo" type="tel" autocomplete="tel" required>
    </div>

    <div class="lp-form-field">
      <label for="referral_phone" data-i18n="referral">Số điện thoại người giới thiệu nếu có</label>
      <input id="referral_phone" name="referral_phone" type="tel">
    </div>

    <div class="lp-form-note">
      <span data-i18n="note">
        Thông tin này được dùng để hỗ trợ thanh toán, gửi hoá đơn, lưu hồ sơ thành viên và áp dụng quyền lợi Lan Pink Member. Khi gửi thông tin, bạn đồng ý tham gia chương trình Lan Pink Member của Lan Pink Tattoo.
      </span>
      <br>
      <a href="/chinh-sach/" data-i18n="privacy">Xem chính sách bảo mật thông tin</a>
    </div>

    <label class="lp-consent">
      <input type="checkbox" name="member_consent" value="yes" required>
      <span data-i18n="consent">Tôi đồng ý để Lan Pink Tattoo lưu thông tin cơ bản nhằm hỗ trợ thanh toán, chăm sóc khách hàng và quyền lợi thành viên cho những lần sau.</span>
    </label>

    <button class="lp-submit" type="submit" data-i18n="submit">Gửi thông tin</button>
    <div id="lp-payment-message" class="lp-small"></div>
    <div class="lp-small" data-i18n="small">Lan Pink Tattoo không chia sẻ thông tin cá nhân của khách cho bên thứ ba ngoài mục đích vận hành dịch vụ.</div>
  </form>
</div>

<script>
(function(){
  const dict = {
    vi: {
      title: "Nhập thông tin thanh toán",
      intro: "Bạn chỉ cần nhập thông tin một lần. Những lần thanh toán sau, Lan Pink Tattoo có thể tra cứu bằng số điện thoại/Zalo để hỗ trợ nhanh hơn.",
      fullName: "Họ tên",
      birthday: "Ngày sinh để nhận voucher sinh nhật",
      email: "Email",
      phone: "Số điện thoại/Zalo nhận hoá đơn thanh toán",
      referral: "Số điện thoại người giới thiệu nếu có",
      note: "Thông tin này được dùng để hỗ trợ thanh toán, gửi hoá đơn, lưu hồ sơ thành viên và áp dụng quyền lợi Lan Pink Member. Khi gửi thông tin, bạn đồng ý tham gia chương trình Lan Pink Member của Lan Pink Tattoo.",
      privacy: "Xem chính sách bảo mật thông tin",
      consent: "Tôi đồng ý để Lan Pink Tattoo lưu thông tin cơ bản nhằm hỗ trợ thanh toán, chăm sóc khách hàng và quyền lợi thành viên cho những lần sau.",
      submit: "Gửi thông tin",
      small: "Lan Pink Tattoo không chia sẻ thông tin cá nhân của khách cho bên thứ ba ngoài mục đích vận hành dịch vụ."
    },
    en: {
      title: "Payment Information",
      intro: "You only need to enter your information once. For future payments, Lan Pink Tattoo can look it up by phone/Zalo to support you faster.",
      fullName: "Full name",
      birthday: "Birthday for birthday voucher",
      email: "Email",
      phone: "Phone/Zalo number for payment invoice",
      referral: "Referrer phone number, if any",
      note: "This information is used to support payment, invoice delivery, member profile storage and Lan Pink Member benefits. By submitting this form, you agree to join the Lan Pink Member program.",
      privacy: "View privacy policy",
      consent: "I agree that Lan Pink Tattoo may store my basic information to support payment, customer care and member benefits for future visits.",
      submit: "Submit information",
      small: "Lan Pink Tattoo does not share customers’ personal information with third parties outside service operation purposes."
    }
  };

  function detectLang(){
    const saved = localStorage.getItem("lp_payment_lang");
    if(saved === "vi" || saved === "en") return saved;
    const path = window.location.pathname.toLowerCase();
    if(path.startsWith("/en/")) return "en";
    const nav = (navigator.language || "").toLowerCase();
    return nav.startsWith("vi") ? "vi" : "en";
  }

  function setLang(lang){
    localStorage.setItem("lp_payment_lang", lang);
    document.documentElement.lang = lang;
    var langInput = document.getElementById("lp_payment_language");
    if(langInput) langInput.value = lang;
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      const key = el.getAttribute("data-i18n");
      if(dict[lang][key]) el.textContent = dict[lang][key];
    });
    document.querySelectorAll("[data-lang-btn]").forEach(function(btn){
      btn.classList.toggle("active", btn.getAttribute("data-lang-btn") === lang);
    });
  }

  document.querySelectorAll("[data-lang-btn]").forEach(function(btn){
    btn.addEventListener("click", function(){
      setLang(btn.getAttribute("data-lang-btn"));
    });
  });


  setLang(detectLang());

  const form = document.getElementById("lp-payment-info-form");
  const msg = document.getElementById("lp-payment-message");

  if(form){
    form.addEventListener("submit", async function(e){
      e.preventDefault();
      msg.textContent = "Đang gửi thông tin...";

      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        const res = await fetch("/.netlify/functions/payment-info", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if(!res.ok || !data.ok){
          msg.textContent = "Gửi chưa thành công. Vui lòng báo nhân viên Lan Pink Tattoo.";
          return;
        }

        form.reset();
        msg.textContent = "Đã nhận thông tin. Cảm ơn bạn!";
      } catch(err) {
        msg.textContent = "Không gửi được thông tin. Vui lòng báo nhân viên Lan Pink Tattoo.";
      }
    });
  }

})();
</script>
