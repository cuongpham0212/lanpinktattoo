"use strict";

(() => {
  const roots =
    document.querySelectorAll(
      "[data-lp-lucky-history]"
    );

  if (!roots.length) {
    return;
  }

  const copy = {
    vi: {
      empty:
        "Chưa có kết quả chính thức nào trong chương trình.",

      error:
        "Lịch sử trúng quà tạm thời chưa tải được. Vui lòng thử lại sau.",

      invoice:
        "Hóa đơn",

      prize: {
        "giai-1":
          "🏆 Giải 1 – Nón bảo hiểm full-face màu hồng",

        "giai-2":
          "🎁 Giải 2 – Áo thun nữ form rộng",

        "giai-3":
          "🎁 Giải 3 – Đồ bộ nữ mặc nhà",

        "giai-4":
          "🎁 Giải 4 – Xà phòng Sinh Dược rửa tay",
      },
    },

    en: {
      empty:
        "No official campaign results have been recorded yet.",

      error:
        "The official winning history is temporarily unavailable. Please try again later.",

      invoice:
        "Bill",

      prize: {
        "giai-1":
          "🏆 Prize 1 – Pink full-face helmet",

        "giai-2":
          "🎁 Prize 2 – Women's oversized T-shirt",

        "giai-3":
          "🎁 Prize 3 – Women's homewear set",

        "giai-4":
          "🎁 Prize 4 – Sinh Duoc hand soap",
      },
    },
  };

  function formatTime(
    iso,
    lang
  ) {
    const date =
      new Date(
        iso
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return new Intl
      .DateTimeFormat(
        lang === "en"
          ? "en-GB"
          : "vi-VN",
        {
          timeZone:
            "Asia/Ho_Chi_Minh",

          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",

          hour12:
            false,
        }
      )
      .format(
        date
      );
  }

  function renderItem(
    item,
    lang
  ) {
    const langCopy =
      copy[lang]
      || copy.vi;

    const li =
      document.createElement(
        "li"
      );

    const heading =
      document.createElement(
        "strong"
      );

    heading.textContent =
      formatTime(
        item.completedAt,
        lang
      )
      + " · "
      + langCopy.invoice
      + " "
      + String(
        item.invoice
        || "LP-••••"
      );

    const prize =
      document.createElement(
        "div"
      );

    prize.textContent =
      langCopy.prize[
        item.prizeId
      ]
      || String(
        item.prizeId
        || ""
      );

    li.append(
      heading,
      prize
    );

    return li;
  }

  async function load(
    root
  ) {
    const lang =
      root.dataset.lang === "en"
        ? "en"
        : "vi";

    const langCopy =
      copy[lang];

    const status =
      root.querySelector(
        "[data-lp-lucky-history-status]"
      );

    const list =
      root.querySelector(
        "[data-lp-lucky-history-list]"
      );

    try {
      const response =
        await fetch(
          "/.netlify/functions/"
          + "minigame-lucky-wheel-history"
          + "?limit=200",
          {
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
        || !data.ok
        || !Array.isArray(
          data.items
        )
      ) {
        throw new Error(
          data.error
          || "history_failed"
        );
      }

      list.replaceChildren();

      if (
        data.items.length === 0
      ) {
        status.textContent =
          langCopy.empty;

        list.hidden =
          true;

        return;
      }

      for (
        const item
        of data.items
      ) {
        list.appendChild(
          renderItem(
            item,
            lang
          )
        );
      }

      status.hidden =
        true;

      list.hidden =
        false;
    } catch (error) {
      console.error(
        "[LanPink Lucky History]",
        error
      );

      status.textContent =
        langCopy.error;

      list.hidden =
        true;
    }
  }

  for (
    const root
    of roots
  ) {
    load(
      root
    );
  }
})();
