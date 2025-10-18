class Dock {
  constructor(root) {
    this.root = root;
    this.icons = [];
    this.animationFrame = null;
    this.mouseX = 0;
    this.buildDock();
    $macEventBus.on("preferences:changed", ({ key, value }) => {
      if (key === "dock-size") {
        this.resizeIcons(value);
      }
    });
  }

  buildDock() {
    this.root.addEventListener("mousemove", (event) => {
      this.mouseX = event.clientX;
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(() => this.updateMagnification());
    });

    this.root.addEventListener("mouseleave", () => {
      this.icons.forEach((icon) => {
        icon.el.style.transform = "";
      });
    });
  }

  addIcon(appId, config) {
    const iconEl = $mac.create("button", "dock-icon", { type: "button" });
    iconEl.dataset.app = appId;
    const baseSize = $macPreferences.get("dock-size", 64);
    iconEl.style.width = `${baseSize}px`;
    iconEl.style.height = `${baseSize}px`;
    if (config.icon) {
      const iconImg = new Image();
      iconImg.src = config.icon;
      iconEl.appendChild(iconImg);
    } else {
      iconEl.appendChild($mac.create("div", "app-icon", { text: config.initials || "App" }));
    }
    $macTooltips.attach(iconEl, config.title || config.initials || appId);
    iconEl.addEventListener("click", () => {
      $macEventBus.emit("dock:launch", { appId });
      iconEl.classList.add("active");
      iconEl.dataset.bouncing = "true";
      iconEl.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-18px)" },
          { transform: "translateY(0)" },
        ],
        {
          duration: 620,
          iterations: 3,
          easing: "ease-out",
        }
      ).onfinish = () => {
        delete iconEl.dataset.bouncing;
      };
    });
    this.root.appendChild(iconEl);
    this.icons.push({ appId, el: iconEl });
  }

  resizeIcons(size) {
    this.icons.forEach(({ el }) => {
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
    });
  }

  setActive(appId, active) {
    const icon = this.icons.find((i) => i.appId === appId);
    if (!icon) return;
    icon.el.classList.toggle("active", active);
  }

  updateMagnification() {
    if (!$macPreferences.get("dock-magnification", true)) {
      this.icons.forEach(({ el }) => {
        el.style.transform = "";
      });
      return;
    }
    this.icons.forEach(({ el }) => {
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(this.mouseX - (rect.left + rect.width / 2));
      const scale = Math.max(1, 1.2 - distance / 400);
      el.style.transform = `scale(${scale}) translateY(${(1 - scale) * 24}px)`;
    });
  }
}

window.$macDock = new Dock(document.getElementById("dock"));
