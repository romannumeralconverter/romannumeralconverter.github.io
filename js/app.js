(function () {
  "use strict";

  const THEME_KEY = "roman-theme";
  const OVERLINE = "\u0305";
  const romanPattern = /^[IVXLCDM\u0305\s]+$/i;

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function setThemeToggleLabel(button, theme) {
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("title", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  function initTheme() {
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) {
      return;
    }

    let current = getPreferredTheme();
    applyTheme(current);
    setThemeToggleLabel(button, current);

    button.addEventListener("click", function () {
      current = current === "dark" ? "light" : "dark";
      applyTheme(current);
      localStorage.setItem(THEME_KEY, current);
      setThemeToggleLabel(button, current);
    });
  }

  function initNav() {
    const page = document.body.getAttribute("data-page");
    const link = document.querySelector('.site-nav a[data-page="' + page + '"]');
    if (link) {
      link.setAttribute("aria-current", "page");
    }

    const nav = document.getElementById("primaryNav");
    const navToggle = document.querySelector("[data-nav-toggle]");
    if (nav && navToggle) {
      navToggle.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
        navToggle.textContent = isOpen ? "Close" : "Menu";
      });

      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.textContent = "Menu";
        });
      });
    }

    document.querySelectorAll(".nav-group__toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        const group = toggle.closest(".nav-group");
        const isOpen = group.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    });

    document.addEventListener("click", function (event) {
      document.querySelectorAll(".nav-group.is-open").forEach(function (group) {
        if (!group.contains(event.target)) {
          group.classList.remove("is-open");
          const toggle = group.querySelector(".nav-group__toggle");
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
          }
        }
      });
      if (nav && navToggle && nav.classList.contains("is-open") && !nav.contains(event.target) && !navToggle.contains(event.target)) {
        closeMobileNav();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }
      document.querySelectorAll(".nav-group.is-open").forEach(function (group) {
        group.classList.remove("is-open");
        const toggle = group.querySelector(".nav-group__toggle");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      if (nav && navToggle) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.textContent = "Menu";
      }
    });
  }

  function standardRoman(number) {
    if (number <= 0) {
      return "";
    }

    const values = [
      [1000, "M"],
      [900, "CM"],
      [500, "D"],
      [400, "CD"],
      [100, "C"],
      [90, "XC"],
      [50, "L"],
      [40, "XL"],
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"]
    ];

    let value = number;
    let result = "";

    for (let i = 0; i < values.length; i += 1) {
      const pair = values[i];
      while (value >= pair[0]) {
        result += pair[1];
        value -= pair[0];
      }
    }

    return result;
  }

  function addOverline(roman) {
    return roman
      .split("")
      .map(function (symbol) {
        return symbol + OVERLINE;
      })
      .join("");
  }

  function toRoman(number) {
    if (!Number.isInteger(number) || number < 1 || number > 999999) {
      throw new Error("Number must be an integer from 1 to 999999.");
    }

    if (number <= 3999) {
      return standardRoman(number);
    }

    const thousandsPart = Math.floor(number / 1000);
    const remainder = number % 1000;

    return addOverline(standardRoman(thousandsPart)) + standardRoman(remainder);
  }

  function tokenizeRoman(input) {
    const normalized = input.normalize("NFD").replace(/\s+/g, "").toUpperCase();
    if (!normalized) {
      throw new Error("Please enter a Roman numeral.");
    }

    if (!romanPattern.test(normalized)) {
      throw new Error("Roman numeral contains invalid characters.");
    }

    const baseValues = {
      I: 1,
      V: 5,
      X: 10,
      L: 50,
      C: 100,
      D: 500,
      M: 1000
    };

    const tokens = [];

    for (let i = 0; i < normalized.length; i += 1) {
      const char = normalized[i];
      if (!baseValues[char]) {
        if (char === OVERLINE) {
          throw new Error("Combining overline must follow a Roman symbol.");
        }
        throw new Error("Roman numeral contains invalid symbols.");
      }

      let value = baseValues[char];
      let symbol = char;
      if (normalized[i + 1] === OVERLINE) {
        value *= 1000;
        symbol += OVERLINE;
        i += 1;
        if (normalized[i + 1] === OVERLINE) {
          throw new Error("Only one overline is allowed per symbol.");
        }
      }

      tokens.push({ symbol: symbol, value: value });
    }

    return {
      tokens: tokens,
      normalized: normalized
    };
  }

  function fromRoman(input) {
    const parsed = tokenizeRoman(input);
    const tokens = parsed.tokens;

    let total = 0;
    for (let i = 0; i < tokens.length; i += 1) {
      const current = tokens[i].value;
      const next = i + 1 < tokens.length ? tokens[i + 1].value : 0;
      if (current < next) {
        total -= current;
      } else {
        total += current;
      }
    }

    if (!Number.isInteger(total) || total < 1 || total > 999999) {
      throw new Error("Roman numeral must evaluate to a value from 1 to 999999.");
    }

    const canonical = toRoman(total).normalize("NFD");
    if (parsed.normalized !== canonical) {
      throw new Error("Roman numeral is not in canonical form.");
    }

    return total;
  }

  function setStatus(el, message, state) {
    if (!el) {
      return;
    }
    el.textContent = message;
    el.dataset.state = state;
  }

  function createRomanSymbol(symbol, overlined) {
    if (!overlined) {
      return document.createTextNode(symbol);
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "roman-overline-svg");
    svg.setAttribute("viewBox", "0 0 32 42");
    svg.setAttribute("width", "0.9em");
    svg.setAttribute("height", "1.2em");
    svg.setAttribute("aria-hidden", "true");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "16");
    text.setAttribute("y", "32");
    text.setAttribute("text-anchor", "middle");
    text.textContent = symbol;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "3");
    line.setAttribute("x2", "29");
    line.setAttribute("y1", "5");
    line.setAttribute("y2", "5");

    svg.append(text, line);
    return svg;
  }

  function renderRomanValue(element, value) {
    element.dataset.copyValue = value;
    element.replaceChildren();
    const symbols = Array.from(value);
    for (let i = 0; i < symbols.length; i += 1) {
      if (symbols[i] === OVERLINE) {
        continue;
      }
      const overlined = symbols[i + 1] === OVERLINE;
      element.appendChild(createRomanSymbol(symbols[i], overlined));
    }
  }

  function initRomanChips() {
    document.querySelectorAll("[data-fill-roman]").forEach(function (button) {
      const value = button.getAttribute("data-fill-roman") || "";
      if (value.indexOf(OVERLINE) === -1) {
        return;
      }
      button.setAttribute("aria-label", "Append " + value + " Roman symbol");
      button.replaceChildren();
      const symbols = Array.from(value);
      for (let i = 0; i < symbols.length; i += 1) {
        if (symbols[i] !== OVERLINE) {
          button.appendChild(createRomanSymbol(symbols[i], symbols[i + 1] === OVERLINE));
        }
      }
    });
  }

  function copyText(text, statusEl) {
    if (!text || text === "-") {
      setStatus(statusEl, "Nothing to copy yet.", "error");
      return;
    }

    const fallbackCopy = function () {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      return copied;
    };

    if (!navigator.clipboard || !window.isSecureContext) {
      const copied = fallbackCopy();
      setStatus(statusEl, copied ? "Result copied to clipboard." : "Clipboard access failed. Copy manually.", copied ? "success" : "error");
      return;
    }

    navigator.clipboard.writeText(text).then(
      function () {
        setStatus(statusEl, "Result copied to clipboard.", "success");
      },
      function () {
        const copied = fallbackCopy();
        setStatus(statusEl, copied ? "Result copied to clipboard." : "Clipboard access failed. Copy manually.", copied ? "success" : "error");
      }
    );
  }

  function initConverter() {
    const numberInput = document.getElementById("numberInput");
    const romanInput = document.getElementById("romanInput");
    if (!numberInput || !romanInput) {
      return;
    }

    const numberResult = document.getElementById("numberResult");
    const romanResult = document.getElementById("romanResult");
    const numberStatus = document.getElementById("numberStatus");
    const romanStatus = document.getElementById("romanStatus");

    document.getElementById("convertToRoman").addEventListener("click", function () {
      const raw = numberInput.value.trim();
      const value = Number(raw);
      if (!raw || !Number.isInteger(value)) {
        numberResult.textContent = "-";
        numberResult.dataset.copyValue = "";
        setStatus(numberStatus, "Enter a whole number between 1 and 999999.", "error");
        return;
      }

      try {
        const roman = toRoman(value);
        renderRomanValue(numberResult, roman);
        setStatus(numberStatus, "Converted successfully.", "success");
      } catch (error) {
        numberResult.textContent = "-";
        numberResult.dataset.copyValue = "";
        setStatus(numberStatus, error.message, "error");
      }
    });

    document.getElementById("clearNumber").addEventListener("click", function () {
      numberInput.value = "";
      numberResult.textContent = "-";
      numberResult.dataset.copyValue = "";
      setStatus(numberStatus, "Fields cleared.", "");
      numberInput.focus();
    });

      document.getElementById("copyRoman").addEventListener("click", function () {
      copyText(numberResult.dataset.copyValue || numberResult.textContent, numberStatus);
    });

    document.getElementById("convertToNumber").addEventListener("click", function () {
      const raw = romanInput.value.trim();
      if (!raw) {
        romanResult.textContent = "-";
        setStatus(romanStatus, "Enter a Roman numeral to convert.", "error");
        return;
      }

      try {
        const number = fromRoman(raw);
        romanResult.textContent = String(number);
        setStatus(romanStatus, "Converted successfully.", "success");
      } catch (error) {
        romanResult.textContent = "-";
        setStatus(romanStatus, error.message, "error");
      }
    });

    document.getElementById("clearRoman").addEventListener("click", function () {
      romanInput.value = "";
      romanResult.textContent = "-";
      setStatus(romanStatus, "Fields cleared.", "");
      romanInput.focus();
    });

    document.getElementById("copyNumber").addEventListener("click", function () {
      copyText(romanResult.textContent, romanStatus);
    });

    numberInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        document.getElementById("convertToRoman").click();
      }
    });

    romanInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        document.getElementById("convertToNumber").click();
      }
    });

    document.querySelectorAll("[data-fill-roman]").forEach(function (button) {
      button.addEventListener("click", function () {
        const value = button.getAttribute("data-fill-roman") || "";
        romanInput.value += value;
        romanInput.focus();
        setStatus(romanStatus, "Roman symbol appended. Click Convert to Number.", "success");
      });
    });
  }

  function initContactMailto() {
    const form = document.getElementById("contactForm");
    if (!form) {
      return;
    }

    const status = document.getElementById("contactStatus");
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const name = document.getElementById("contactName").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const subjectRaw = document.getElementById("contactSubject").value.trim();
      const messageRaw = document.getElementById("contactMessage").value.trim();

      if (!name || !email || !subjectRaw || !messageRaw) {
        setStatus(status, "Please complete all fields before sending.", "error");
        return;
      }

      const subject = encodeURIComponent("[roman-numeral.org] " + subjectRaw);
      const body = encodeURIComponent(
        "Name: " +
          name +
          "\nEmail: " +
          email +
          "\n\nMessage:\n" +
          messageRaw
      );

      const mailto = "mailto:support@roman-numeral.org?subject=" + subject + "&body=" + body;
      window.location.href = mailto;
      setStatus(status, "Your email app should open with a pre-filled draft.", "success");
    });
  }

  initTheme();
  initNav();
  initRomanChips();
  initConverter();
  initContactMailto();
})();
