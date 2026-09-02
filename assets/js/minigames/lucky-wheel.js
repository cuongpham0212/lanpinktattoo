(() => {
  "use strict";

  const config =
    window.LP_LUCKY_WHEEL;

  const wheel =
    document.getElementById(
      "lpLuckyWheel"
    );

  const button =
    document.getElementById(
      "lpLuckySpin"
    );

  const result =
    document.getElementById(
      "lpLuckyResult"
    );

  if (
    !config
    || !wheel
    || !button
    || !result
  ) {
    return;
  }

  const prizes =
    Array.isArray(
      config.prizes
    )
      ? config.prizes
      : [];

  if (!prizes.length) {
    return;
  }

  const lang =
    document.documentElement.lang
      .toLowerCase()
      .startsWith("en")
      ? "en"
      : "vi";

  const copy = {
    vi: {
      checking:
        "Đang kiểm tra lượt quay từ hóa đơn...",

      missing:
        "Vui lòng mở vòng quay từ hóa đơn Lan Pink hợp lệ.",

      invalid:
        "Không thể xác minh lượt quay của hóa đơn này.",

      ready:
        "Hóa đơn hợp lệ. Bạn có thể bắt đầu quay.",

      finished:
        "Bạn đã sử dụng hết lượt quay của hóa đơn này.",

      error:
        "Có lỗi khi xử lý lượt quay. Hãy thử lại.",

      invoice:
        "Hóa đơn",

      amount:
        "Thực trả",

      total:
        "Tổng lượt",

      remaining:
        "Còn lại",

      noSpins:
        "HẾT LƯỢT",

      demo:
        "DEMO LOCAL • Không ghi dữ liệu thật",
    },

    en: {
      checking:
        "Checking spins from your invoice...",

      missing:
        "Please open the wheel from a valid Lan Pink invoice.",

      invalid:
        "Unable to verify this invoice.",

      ready:
        "Invoice verified. You can start spinning.",

      finished:
        "All spins for this invoice have been used.",

      error:
        "Unable to process this spin. Please try again.",

      invoice:
        "Invoice",

      amount:
        "Paid",

      total:
        "Total spins",

      remaining:
        "Remaining",

      noSpins:
        "NO SPINS LEFT",

      demo:
        "LOCAL DEMO • No real data stored",
    },
  }[lang];

  const params =
    new URLSearchParams(
      window.location.search
    );

  const access = {
    campaign:
      params.get("campaign")
      || "",

    invoice:
      params.get("invoice")
      || "",

    amount:
      params.get("amount")
      || "",

    spins:
      params.get("spins")
      || "",

    sig:
      params.get("sig")
      || "",
  };

  const demoAmount =
    Number(
      params.get(
        "demoAmount"
      )
    );

  const localDemo =
    (
      location.hostname
        === "localhost"
      || location.hostname
        === "127.0.0.1"
    )
    && Number.isSafeInteger(
      demoAmount
    )
    && demoAmount > 0;

  const accessMessage =
    document.getElementById(
      "lpLuckyAccessMessage"
    );

  const accessStats =
    document.getElementById(
      "lpLuckyAccessStats"
    );

  const invoiceCodeEl =
    document.getElementById(
      "lpLuckyInvoiceCode"
    );

  const amountEl =
    document.getElementById(
      "lpLuckyInvoiceAmount"
    );

  const totalEl =
    document.getElementById(
      "lpLuckyTotalSpins"
    );

  const remainingEl =
    document.getElementById(
      "lpLuckyRemainingSpins"
    );

  document.getElementById(
    "lpLuckyInvoiceLabel"
  ).textContent = copy.invoice;

  document.getElementById(
    "lpLuckyAmountLabel"
  ).textContent = copy.amount;

  document.getElementById(
    "lpLuckyTotalLabel"
  ).textContent = copy.total;

  document.getElementById(
    "lpLuckyRemainingLabel"
  ).textContent =
    copy.remaining;

  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const spinDuration =
    reduceMotion
      ? 700
      : (
          Number(
            config.spin_duration_ms
          )
          || 4600
        );

  const resultHold =
    Number(
      config.result_hold_ms
    ) || 2400;

  let rotation = 0;
  let spinning = false;

  let state = {
    amount: 0,
    totalSpins: 0,
    usedSpins: 0,
    remainingSpins: 0,
  };

  function formatMoney(
    amount
  ) {
    return (
      new Intl.NumberFormat(
        lang === "en"
          ? "en-US"
          : "vi-VN"
      ).format(
        Number(amount) || 0
      )
      + "đ"
    );
  }

  function buildWheel() {
    wheel.replaceChildren();

    const slice =
      360 / prizes.length;

    const gradient =
      prizes.map(
        (_, index) => {
          const start =
            index * slice;

          const end =
            start + slice;

          return (
            `var(--lp-game-seg-${index + 1}) `
            + `${start}deg ${end}deg`
          );
        }
      ).join(", ");

    wheel.style.background =
      `conic-gradient(${gradient})`;

    prizes.forEach(
      (prize, index) => {
        const center =
          index * slice
          + slice / 2;

        const radians =
          center
          * Math.PI
          / 180;

        const label =
          document.createElement(
            "span"
          );

        label.className =
          "lp-lucky-label";

        label.textContent =
          prize.label;

        label.style.left =
          `${
            50
            + Math.sin(
                radians
              ) * 34
          }%`;

        label.style.top =
          `${
            50
            - Math.cos(
                radians
              ) * 34
          }%`;

        label.style.transform =
          "translate(-50%, -50%)";

        wheel.appendChild(
          label
        );
      }
    );
  }

  function setUnavailable(
    message
  ) {
    accessMessage.textContent =
      message;

    accessStats.hidden = true;

    button.disabled = true;
  }

  function renderStatus(
    message
  ) {
    accessMessage.textContent =
      message;

    accessStats.hidden = false;

    invoiceCodeEl.textContent =
      localDemo
        ? "DEMO"
        : access.invoice;

    amountEl.textContent =
      formatMoney(
        state.amount
      );

    totalEl.textContent =
      String(
        state.totalSpins
      );

    remainingEl.textContent =
      String(
        state.remainingSpins
      );

    if (
      !spinning
      && state.remainingSpins > 0
    ) {
      button.disabled = false;

      button.textContent =
        config.spin_button;
    } else {
      button.disabled = true;

      if (
        state.remainingSpins <= 0
      ) {
        button.textContent =
          copy.noSpins;
      }
    }
  }

  function accessQuery() {
    const query =
      new URLSearchParams();

    Object.entries(
      access
    ).forEach(
      ([key, value]) => {
        query.set(
          key,
          value
        );
      }
    );

    return query.toString();
  }

  async function loadStatus() {
    accessMessage.textContent =
      copy.checking;

    if (localDemo) {
      const spins =
        Math.floor(
          demoAmount / 500000
        );

      state = {
        amount:
          demoAmount,

        totalSpins:
          spins,

        usedSpins:
          0,

        remainingSpins:
          spins,
      };

      renderStatus(
        copy.demo
      );

      return;
    }

    if (
      !access.campaign
      || !access.invoice
      || !access.amount
      || !access.spins
      || !access.sig
    ) {
      setUnavailable(
        copy.missing
      );

      return;
    }

    try {
      const response =
        await fetch(
          "/.netlify/functions/"
          + "minigame-lucky-wheel-status?"
          + accessQuery(),
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
      ) {
        throw new Error(
          data.error
          || "status_failed"
        );
      }

      state = {
        amount:
          Number(
            data.amount
          ) || 0,

        totalSpins:
          Number(
            data.totalSpins
          ) || 0,

        usedSpins:
          Number(
            data.usedSpins
          ) || 0,

        remainingSpins:
          Number(
            data.remainingSpins
          ) || 0,
      };

      renderStatus(
        state.remainingSpins > 0
          ? copy.ready
          : copy.finished
      );
    } catch (error) {
      console.error(
        "[LanPink Lucky Wheel]",
        error
      );

      setUnavailable(
        copy.invalid
      );
    }
  }

  function requestIdKey() {
    return (
      "lp-lucky-request:"
      + access.invoice
    );
  }

  function makeRequestId() {
    if (
      window.crypto
      ?.randomUUID
    ) {
      return (
        "spin_"
        + window.crypto
          .randomUUID()
          .replaceAll(
            "-",
            "_"
          )
      );
    }

    return (
      "spin_"
      + Date.now()
      + "_"
      + Math.random()
        .toString(36)
        .slice(2)
    );
  }

  async function requestSpin() {
    if (localDemo) {
      const weights = [
        ["giai-1", 1],
        ["giai-2", 24],
        ["giai-3", 25],
        ["giai-4", 50],
      ];

      let cursor =
        Math.random() * 100;

      let prizeId =
        "giai-4";

      for (
        const [
          id,
          weight
        ] of weights
      ) {
        cursor -= weight;

        if (cursor < 0) {
          prizeId = id;
          break;
        }
      }

      state.usedSpins += 1;

      state.remainingSpins =
        Math.max(
          0,
          state.remainingSpins - 1
        );

      return prizeId;
    }

    const key =
      requestIdKey();

    let clientRequestId =
      sessionStorage.getItem(
        key
      );

    if (!clientRequestId) {
      clientRequestId =
        makeRequestId();

      sessionStorage.setItem(
        key,
        clientRequestId
      );
    }

    const response =
      await fetch(
        "/.netlify/functions/"
        + "minigame-lucky-wheel-play",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              ...access,
              clientRequestId,
            }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
      || !data.ok
    ) {
      if (
        Number.isFinite(
          Number(
            data.remainingSpins
          )
        )
      ) {
        state.remainingSpins =
          Number(
            data.remainingSpins
          );
      }

      throw new Error(
        data.reason
        || data.error
        || "spin_failed"
      );
    }

    sessionStorage.removeItem(
      key
    );

    state = {
      amount:
        Number(
          data.amount
        ) || state.amount,

      totalSpins:
        Number(
          data.totalSpins
        ) || state.totalSpins,

      usedSpins:
        Number(
          data.usedSpins
        ) || 0,

      remainingSpins:
        Number(
          data.remainingSpins
        ) || 0,
    };

    return data.prizeId;
  }

  function clearWinner() {
    document
      .querySelectorAll(
        ".lp-lucky-prize.is-winner"
      )
      .forEach(
        element =>
          element.classList.remove(
            "is-winner"
          )
      );
  }

  function animateToPrize(
    prizeId
  ) {
    const index =
      prizes.findIndex(
        prize =>
          prize.id
          === prizeId
      );

    if (index < 0) {
      throw new Error(
        "Unknown prize"
      );
    }

    const slice =
      360 / prizes.length;

    const center =
      index * slice
      + slice / 2;

    const current =
      (
        rotation % 360
        + 360
      ) % 360;

    const target =
      (
        360 - center
        + 360
      ) % 360;

    const delta =
      (
        target
        - current
        + 360
      ) % 360;

    rotation +=
      6 * 360
      + delta;

    wheel.style
      .transitionDuration =
        `${spinDuration}ms`;

    wheel.style.transform =
      `rotate(${rotation}deg)`;

    return prizes[index];
  }

  function showWinner(
    prize
  ) {
    result.textContent =
      `${
        config.result_prefix
      } ${prize.label}`;

    result.classList.add(
      "is-visible"
    );

    window.setTimeout(
      () => {
        const target =
          document.getElementById(
            `lp-prize-${prize.id}`
          );

        if (!target) {
          return;
        }

        target.classList.add(
          "is-winner"
        );

        target.scrollIntoView({
          behavior:
            reduceMotion
              ? "auto"
              : "smooth",

          block:
            "center",
        });

        window.setTimeout(
          () => {
            target.classList.remove(
              "is-winner"
            );
          },
          5000
        );
      },
      resultHold
    );
  }

  async function spin() {
    if (
      spinning
      || state.remainingSpins <= 0
    ) {
      return;
    }

    spinning = true;

    clearWinner();

    result.classList.remove(
      "is-visible"
    );

    result.textContent = "";

    button.disabled = true;

    button.textContent =
      config.spinning_text;

    try {
      const prizeId =
        await requestSpin();

      const prize =
        animateToPrize(
          prizeId
        );

      window.setTimeout(
        () => {
          spinning = false;

          renderStatus(
            state.remainingSpins > 0
              ? copy.ready
              : copy.finished
          );

          showWinner(
            prize
          );
        },
        spinDuration + 80
      );
    } catch (error) {
      spinning = false;

      console.error(
        "[LanPink Lucky Wheel]",
        error
      );

      renderStatus(
        state.remainingSpins > 0
          ? copy.error
          : copy.finished
      );
    }
  }

  buildWheel();

  button.addEventListener(
    "click",
    spin
  );

  loadStatus();
})();
