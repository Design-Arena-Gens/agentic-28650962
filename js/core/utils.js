window.$mac = {
  create(tag, classes = [], attrs = {}) {
    const el = document.createElement(tag);
    if (typeof classes === "string" && classes) {
      el.className = classes;
    } else if (Array.isArray(classes) && classes.length) {
      el.classList.add(...classes);
    }
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === "text") {
        el.textContent = value;
      } else if (key === "html") {
        el.innerHTML = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    return el;
  },

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  },

  focusWithin(el) {
    return !!el.querySelector(":focus");
  },

  randomId(prefix = "mac") {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  },

  formatDateTime(date = new Date()) {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
};
