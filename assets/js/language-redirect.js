/**
 * Lan Pink Tattoo — Browser language redirect
 *
 * Chỉ redirect khi:
 * - Trang hiện tại là tiếng Việt.
 * - Front matter có english_url.
 * - Ngôn ngữ ưu tiên đầu tiên của trình duyệt là tiếng Anh.
 *
 * Không tự suy luận hoặc thay thế slug.
 * URL đích luôn do Hugo truyền từ front matter.
 */
(function () {
  "use strict";

  var config = window.LP_LANGUAGE_REDIRECT;

  if (!config || config.pageLanguage !== "vi" || !config.englishUrl) {
    return;
  }

  // Không redirect bot, crawler và công cụ kiểm tra hiệu năng.
  var userAgent = navigator.userAgent || "";

  if (
    /bot|crawler|spider|crawling|google-inspectiontool|lighthouse/i.test(
      userAgent
    )
  ) {
    return;
  }

  // Cho phép giữ lại trang VI khi truy cập bằng ?lang=vi.
  var searchParams = new URLSearchParams(window.location.search);

  if (searchParams.get("lang") === "vi") {
    return;
  }

  var browserLanguages =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || ""];

  var preferredLanguage = String(browserLanguages[0] || "").toLowerCase();

  if (!preferredLanguage.startsWith("en")) {
    return;
  }

  try {
    var targetUrl = new URL(config.englishUrl, window.location.origin);

    // Chỉ cho phép redirect trong cùng website.
    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    // Tránh redirect về chính URL hiện tại.
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search
    ) {
      return;
    }

    // Giữ fragment như #gallery khi URL đích chưa có fragment.
    if (!targetUrl.hash && window.location.hash) {
      targetUrl.hash = window.location.hash;
    }

    window.location.replace(targetUrl.href);
  } catch (error) {
    console.warn("[LanPink] English redirect URL không hợp lệ.", error);
  }
})();
