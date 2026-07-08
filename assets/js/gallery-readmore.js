document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".lp-gallery-readmore-root").forEach(function (root) {
    var content = root.closest(".lp-content");
    if (!content) return;

    var gallery = content.querySelector(".lp-json-gallery");
    if (!gallery) return;

    var children = Array.from(content.childNodes);
    var introCount = 0;
    var introEnd = null;

    for (var i = 0; i < children.length; i++) {
      var node = children[i];

      if (node === gallery || (node.nodeType === 1 && node.contains(gallery))) break;

      if (node.nodeType === 1 && node.tagName === "P" && node.textContent.trim()) {
        introCount++;
        introEnd = node;
        if (introCount >= 2) break;
      }
    }

    if (!introEnd) return;

    var hidden = document.createElement("div");
    hidden.className = "lp-gallery-hidden-content";
    hidden.hidden = true;

    while (introEnd.nextSibling && introEnd.nextSibling !== gallery) {
      hidden.appendChild(introEnd.nextSibling);
    }

    if (!hidden.textContent.trim()) {
      root.remove();
      return;
    }

    var wrap = document.createElement("div");
    wrap.className = "lp-gallery-xem-tiep-wrap";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lp-gallery-xem-tiep";
    btn.textContent = root.dataset.lang === "en" ? "see more" : "xem tiếp";

    btn.addEventListener("click", function () {
      hidden.hidden = false;
      btn.classList.add("is-open");
    });

    wrap.appendChild(btn);

    gallery.parentNode.insertBefore(wrap, gallery);
    gallery.parentNode.insertBefore(hidden, gallery);

    root.remove();
  });
});
