document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".js-home-marquee").forEach(function (track) {
    var originalItems = Array.from(track.children);

    if (originalItems.length < 2) {
      track.classList.add("is-ready");
      return;
    }

    var startIndex = Math.floor(Math.random() * originalItems.length);
    var orderedItems = originalItems
      .slice(startIndex)
      .concat(originalItems.slice(0, startIndex));

    track.replaceChildren();

    orderedItems.forEach(function (item) {
      track.appendChild(item);
    });

    orderedItems.forEach(function (item) {
      var clone = item.cloneNode(true);

      clone.setAttribute("aria-hidden", "true");

      if (clone.matches("a, button, input, select, textarea, [tabindex]")) {
        clone.setAttribute("tabindex", "-1");
      }

      clone
        .querySelectorAll("a, button, input, select, textarea, [tabindex]")
        .forEach(function (focusable) {
          focusable.setAttribute("tabindex", "-1");
        });

      track.appendChild(clone);
    });

    requestAnimationFrame(function () {
      track.classList.add("is-ready");
    });
  });
});
