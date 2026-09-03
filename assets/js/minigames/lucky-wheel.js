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

  // LANPINK_GUEST_DEMO_V1
  const guestCopy = {
    vi: {
      ready:
        "LƯỢT QUAY TRẢI NGHIỆM • Bạn có 2 lượt quay thử",

      oneLeft:
        "Bạn đã quay thử 1/2 lượt • Còn 1 lượt trải nghiệm",

      finished:
        "Bạn đã dùng 2/2 lượt quay thử • Đặt lịch để nhận lượt quay chính thức",

      spinButton:
        "QUAY THỬ",

      ctaButton:
        "NHẬN LƯỢT QUAY CHÍNH THỨC",

      resultPrefix:
        "Bạn vừa quay thử vào",

      eyebrow:
        "VÒNG QUAY TRẢI NGHIỆM",

      modalTitle:
        "Muốn quay thật và nhận quà tại tiệm?",

      modalBody:
        "Hai lượt vừa rồi là lượt trải nghiệm nên chưa phát sinh quà nhận tại tiệm.",

      modalRule:
        "Xăm tại Lan Pink Tattoo với hóa đơn thanh toán từ 500.000đ để nhận lượt quay chính thức. Mỗi 500.000đ = 1 lượt quay, làm tròn xuống. 100% lượt quay chính thức đều có quà và nhận quà ngay tại tiệm.",

      cta:
        "ĐẶT LỊCH XĂM & NHẬN LƯỢT QUAY",

      later:
        "Để sau",

      close:
        "Đóng",

      ctaHref:
        "/dat-lich/",
    },

    en: {
      ready:
        "DEMO SPINS • You have 2 trial spins",

      oneLeft:
        "You used 1/2 trial spins • 1 demo spin left",

      finished:
        "You used 2/2 trial spins • Book to unlock official spins",

      spinButton:
        "TRY A SPIN",

      ctaButton:
        "GET OFFICIAL SPINS",

      resultPrefix:
        "Your demo spin landed on",

      eyebrow:
        "LUCKY WHEEL DEMO",

      modalTitle:
        "Want to spin for real and receive a gift?",

      modalBody:
        "These two spins are for demonstration only and do not grant a physical prize.",

      modalRule:
        "Get tattooed at Lan Pink Tattoo and pay at least VND 500,000 to receive official spins. Every VND 500,000 paid gives 1 spin, rounded down. Every official spin wins a gift collected at the studio.",

      cta:
        "BOOK A TATTOO & GET SPINS",

      later:
        "Maybe later",

      close:
        "Close",

      ctaHref:
        "/en/booking/",
    },
  }[lang];

  const GUEST_DEMO_LIMIT = 2;

  const GUEST_DEMO_STORAGE_KEY =
    "lp-lucky-guest-demo:"
    + "october-lucky-wheel-2026:"
    + "v1";


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

  const hasSignedAccess =
    Boolean(
      access.campaign
      && access.invoice
      && access.amount
      && access.spins
      && access.sig
    );

  const guestDemo =
    !localDemo
    && !hasSignedAccess;


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

  const guestDialog =
    document.getElementById(
      "lpLuckyGuestDialog"
    );

  const guestClose =
    document.getElementById(
      "lpLuckyGuestClose"
    );

  const guestEyebrow =
    document.getElementById(
      "lpLuckyGuestEyebrow"
    );

  const guestTitle =
    document.getElementById(
      "lpLuckyGuestTitle"
    );

  const guestBody =
    document.getElementById(
      "lpLuckyGuestBody"
    );

  const guestRule =
    document.getElementById(
      "lpLuckyGuestRule"
    );

  const guestCta =
    document.getElementById(
      "lpLuckyGuestCta"
    );

  const guestLater =
    document.getElementById(
      "lpLuckyGuestLater"
    );

  guestClose.setAttribute(
    "aria-label",
    guestCopy.close
  );

  guestEyebrow.textContent =
    guestCopy.eyebrow;

  guestTitle.textContent =
    guestCopy.modalTitle;

  guestBody.textContent =
    guestCopy.modalBody;

  guestRule.textContent =
    guestCopy.modalRule;

  guestCta.textContent =
    guestCopy.cta;

  guestCta.href =
    guestCopy.ctaHref;

  guestLater.textContent =
    guestCopy.later;



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

  function readGuestDemoUsed() {
    try {
      const stored =
        Number(
          localStorage.getItem(
            GUEST_DEMO_STORAGE_KEY
          )
        );

      if (
        Number.isSafeInteger(stored)
      ) {
        return Math.min(
          GUEST_DEMO_LIMIT,
          Math.max(
            0,
            stored
          )
        );
      }
    } catch (error) {
      console.warn(
        "[LanPink Lucky Wheel] Guest storage unavailable",
        error
      );
    }

    return 0;
  }


  function writeGuestDemoUsed(
    used
  ) {
    try {
      localStorage.setItem(
        GUEST_DEMO_STORAGE_KEY,
        String(
          Math.min(
            GUEST_DEMO_LIMIT,
            Math.max(
              0,
              used
            )
          )
        )
      );
    } catch (error) {
      console.warn(
        "[LanPink Lucky Wheel] Guest storage unavailable",
        error
      );
    }
  }


  function closeGuestDialog() {
    if (
      typeof guestDialog.close
      === "function"
      && guestDialog.open
    ) {
      guestDialog.close();
      return;
    }

    guestDialog.removeAttribute(
      "open"
    );
  }


  function openGuestDialog() {
    if (!guestDemo) {
      return;
    }

    if (
      typeof guestDialog.showModal
      === "function"
    ) {
      if (!guestDialog.open) {
        guestDialog.showModal();
      }

      return;
    }

    guestDialog.setAttribute(
      "open",
      ""
    );
  }


  guestClose.addEventListener(
    "click",
    closeGuestDialog
  );

  guestLater.addEventListener(
    "click",
    closeGuestDialog
  );

  guestDialog.addEventListener(
    "click",
    event => {
      if (
        event.target
        === guestDialog
      ) {
        closeGuestDialog();
      }
    }
  );


  function renderGuestStatus() {
    accessStats.hidden = true;

    if (
      state.remainingSpins <= 0
    ) {
      accessMessage.textContent =
        guestCopy.finished;

      button.disabled =
        spinning;

      button.textContent =
        guestCopy.ctaButton;

      return;
    }

    accessMessage.textContent =
      state.usedSpins > 0
        ? guestCopy.oneLeft
        : guestCopy.ready;

    button.disabled =
      spinning;

    button.textContent =
      guestCopy.spinButton;
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

      if (guestDemo) {
        const used =
          readGuestDemoUsed();

        state = {
          amount: 0,

          totalSpins:
            GUEST_DEMO_LIMIT,

          usedSpins:
            used,

          remainingSpins:
            Math.max(
              0,
              GUEST_DEMO_LIMIT
              - used
            ),
        };

        renderGuestStatus();

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
    
      if (guestDemo) {
        const guestSpinNumber =
          state.usedSpins + 1;

        let prizeId =
          "giai-1";

        if (
          guestSpinNumber >= 2
        ) {
          const weights = [
            ["giai-2", 25],
            ["giai-3", 50],
            ["giai-4", 24],
          ];

          const totalWeight =
            weights.reduce(
              (total, item) =>
                total + item[1],
              0
            );

          let cursor =
            Math.random()
            * totalWeight;

          prizeId =
            "giai-4";

          for (
            const [
              id,
              weight
            ]
            of weights
          ) {
            cursor -= weight;

            if (cursor < 0) {
              prizeId = id;
              break;
            }
          }
        }

        state.usedSpins =
          Math.min(
            GUEST_DEMO_LIMIT,
            state.usedSpins + 1
          );

        state.remainingSpins =
          Math.max(
            0,
            GUEST_DEMO_LIMIT
            - state.usedSpins
          );

        writeGuestDemoUsed(
          state.usedSpins
        );

        return prizeId;
      }

if (localDemo) {
      const weights = [
        ["giai-1", 1],
        ["giai-2", 25],
        ["giai-3", 50],
        ["giai-4", 24],
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
        guestDemo
          ? `${
              guestCopy.resultPrefix
            } ${prize.label}`
          : `${
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
    if (spinning) {
        return;
      }

      if (
        guestDemo
        && state.remainingSpins <= 0
      ) {
        openGuestDialog();
        return;
      }

      if (
        state.remainingSpins <= 0
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

          if (guestDemo) {
              renderGuestStatus();
            } else {
              renderStatus(
                state.remainingSpins > 0
                  ? copy.ready
                  : copy.finished
              );
            }

            showWinner(
              prize
            );

            if (
              guestDemo
              && state.remainingSpins <= 0
            ) {
              window.setTimeout(
                openGuestDialog,
                resultHold + 600
              );
            }
        },
        spinDuration + 80
      );
    } catch (error) {
      spinning = false;

      console.error(
        "[LanPink Lucky Wheel]",
        error
      );

      if (guestDemo) {
        renderGuestStatus();
      } else {
        renderStatus(
          state.remainingSpins > 0
            ? copy.error
            : copy.finished
        );
      }
    }
  }

  buildWheel();

  button.addEventListener(
    "click",
    spin
  );

  loadStatus();
})();
