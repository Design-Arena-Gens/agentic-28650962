class WindowManager {
  constructor(root) {
    this.root = root;
    this.windows = [];
    this.activeWindow = null;
    this.zIndexBase = 100;
    this.restoreState();
    this.bindShortcuts();
    window.addEventListener("resize", () => this.constrainAll());
  }

  bindShortcuts() {
    document.addEventListener("keydown", (event) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      switch (event.key.toLowerCase()) {
        case "`":
          event.preventDefault();
          this.cycleWindows();
          break;
        case "m":
          if (!event.shiftKey) return;
          event.preventDefault();
          $macEventBus.emit("mission-control:toggle");
          break;
        default:
          break;
      }
    });
  }

  cycleWindows() {
    if (!this.windows.length) return;
    const activeIdx = this.windows.findIndex((w) => w.id === this.activeWindow);
    const nextIdx = (activeIdx + 1) % this.windows.length;
    this.focusWindow(this.windows[nextIdx].id);
  }

  createWindow(config) {
    const id = config.id || $mac.randomId("win");
    const saved = JSON.parse(localStorage.getItem(`macos-win-${id}`) || "{}");
    const winEl = $mac.create("div", "window");
    winEl.dataset.id = id;
    winEl.style.width = `${saved.width || config.width || 640}px`;
    winEl.style.height = `${saved.height || config.height || 420}px`;
    winEl.style.left = `${saved.left || config.left || Math.random() * 200 + 120}px`;
    winEl.style.top = `${saved.top || config.top || Math.random() * 120 + 80}px`;

    const header = this.buildHeader(id, config);
    winEl.appendChild(header);

    if (config.toolbar) {
      const toolbar = $mac.create("div", "window-toolbar");
      toolbar.appendChild(config.toolbar);
      winEl.appendChild(toolbar);
    }

    const content = $mac.create("div", "window-content");
    content.appendChild(config.content);
    winEl.appendChild(content);

    this.root.appendChild(winEl);
    this.registerWindow({ id, el: winEl, config });
    this.makeInteractive(winEl);
    this.focusWindow(id);
    $macEventBus.emit("window:created", { id, config });
    return id;
  }

  buildHeader(id, config) {
    const header = $mac.create("div", "window-header");

    const lights = $mac.create("div", "traffic-lights");
    const close = $mac.create("button", ["traffic-light", "red"], { type: "button" });
    close.addEventListener("click", () => this.closeWindow(id));
    const minimize = $mac.create("button", ["traffic-light", "yellow"], { type: "button" });
    minimize.addEventListener("click", () => this.minimizeWindow(id));
    const maximize = $mac.create("button", ["traffic-light", "green"], { type: "button" });
    maximize.addEventListener("click", () => this.toggleFullscreen(id));

    lights.append(close, minimize, maximize);

    header.appendChild(lights);
    const title = $mac.create("div", "window-title", { text: config.title || "Untitled" });
    header.appendChild(title);

    return header;
  }

  registerWindow(windowObj) {
    const { id, config } = windowObj;
    this.windows.push(windowObj);
    this.persistState(id, {
      width: parseInt(windowObj.el.style.width, 10),
      height: parseInt(windowObj.el.style.height, 10),
      left: parseInt(windowObj.el.style.left, 10),
      top: parseInt(windowObj.el.style.top, 10),
      title: config.title,
    });
  }

  makeInteractive(winEl) {
    const header = winEl.querySelector(".window-header");
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let resizing = false;

    const onMouseMove = (event) => {
      if (resizing) {
        const width = $mac.clamp(event.clientX - winEl.offsetLeft, 320, window.innerWidth - 60);
        const height = $mac.clamp(event.clientY - winEl.offsetTop, 240, window.innerHeight - 80);
        winEl.style.width = `${width}px`;
        winEl.style.height = `${height}px`;
        this.persistGeometry(winEl);
        return;
      }
      const newLeft = initialLeft + (event.clientX - startX);
      const newTop = initialTop + (event.clientY - startY);
      winEl.style.left = `${$mac.clamp(newLeft, -winEl.offsetWidth / 2, window.innerWidth - 120)}px`;
      winEl.style.top = `${$mac.clamp(newTop, 32, window.innerHeight - 180)}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      resizing = false;
      this.persistGeometry(winEl);
    };

    header.addEventListener("mousedown", (event) => {
      if (event.target.classList.contains("traffic-light")) return;
      this.focusWindow(winEl.dataset.id);
      startX = event.clientX;
      startY = event.clientY;
      initialLeft = parseInt(winEl.style.left, 10);
      initialTop = parseInt(winEl.style.top, 10);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    const resizeHandle = $mac.create("div", null);
    resizeHandle.style.position = "absolute";
    resizeHandle.style.right = "0";
    resizeHandle.style.bottom = "0";
    resizeHandle.style.width = "18px";
    resizeHandle.style.height = "18px";
    resizeHandle.style.cursor = "nwse-resize";
    resizeHandle.style.borderBottomRightRadius = "18px";
    resizeHandle.style.background = "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(200,200,210,0.2))";
    resizeHandle.style.opacity = "0";
    resizeHandle.style.transition = "opacity 120ms ease";
    winEl.appendChild(resizeHandle);

    winEl.addEventListener("mouseenter", () => {
      resizeHandle.style.opacity = "1";
    });

    winEl.addEventListener("mouseleave", () => {
      resizeHandle.style.opacity = "0";
    });

    resizeHandle.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      resizing = true;
      startX = event.clientX;
      startY = event.clientY;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  focusWindow(id) {
    const windowObj = this.windows.find((w) => w.id === id);
    if (!windowObj) return;
    this.windows.forEach((w) => {
      if (w.id === id) {
        w.el.classList.remove("inactive");
        w.el.style.zIndex = this.zIndexBase + 50;
        this.activeWindow = id;
      } else {
        w.el.classList.add("inactive");
        w.el.style.zIndex = this.zIndexBase;
      }
    });
    $macEventBus.emit("window:focused", { id });
  }

  closeWindow(id) {
    const idx = this.windows.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const win = this.windows[idx];
    const appId = win.config?.appId;
    win.el.remove();
    this.windows.splice(idx, 1);
    if (this.activeWindow === id) {
      this.activeWindow = null;
      if (this.windows.length) {
        this.focusWindow(this.windows[this.windows.length - 1].id);
      }
    }
    localStorage.removeItem(`macos-win-${id}`);
    $macEventBus.emit("window:closed", { id, appId });
    if (!this.activeWindow && !this.windows.length) {
      $macEventBus.emit("window:focused", { id: null });
    }
  }

  minimizeWindow(id) {
    const windowObj = this.windows.find((w) => w.id === id);
    if (!windowObj) return;
    windowObj.el.classList.add("minimized");
    windowObj.el.style.transform = "scale(0.2) translateY(480px)";
    windowObj.el.style.opacity = "0";
    setTimeout(() => {
      windowObj.el.style.display = "none";
    }, 250);
    $macEventBus.emit("window:minimized", { id });
  }

  restoreWindow(id) {
    const windowObj = this.windows.find((w) => w.id === id);
    if (!windowObj) return;
    windowObj.el.style.display = "flex";
    requestAnimationFrame(() => {
      windowObj.el.style.transform = "";
      windowObj.el.style.opacity = "1";
      windowObj.el.classList.remove("minimized");
      this.focusWindow(id);
    });
    $macEventBus.emit("window:restored", { id });
  }

  toggleFullscreen(id) {
    const windowObj = this.windows.find((w) => w.id === id);
    if (!windowObj) return;
    windowObj.el.classList.toggle("fullscreen");
    if (windowObj.el.classList.contains("fullscreen")) {
      windowObj.prevBounds = {
        width: windowObj.el.style.width,
        height: windowObj.el.style.height,
        left: windowObj.el.style.left,
        top: windowObj.el.style.top,
      };
      windowObj.el.style.width = `${window.innerWidth - 24}px`;
      windowObj.el.style.height = `${window.innerHeight - 80}px`;
      windowObj.el.style.left = "12px";
      windowObj.el.style.top = "44px";
    } else if (windowObj.prevBounds) {
      Object.assign(windowObj.el.style, windowObj.prevBounds);
    }
    this.persistGeometry(windowObj.el);
  }

  persistGeometry(winEl) {
    const id = winEl.dataset.id;
    const state = JSON.parse(localStorage.getItem(`macos-win-${id}`) || "{}");
    state.width = parseInt(winEl.style.width, 10);
    state.height = parseInt(winEl.style.height, 10);
    state.left = parseInt(winEl.style.left, 10);
    state.top = parseInt(winEl.style.top, 10);
    localStorage.setItem(`macos-win-${id}`, JSON.stringify(state));
  }

  persistState(id, data) {
    const existing = JSON.parse(localStorage.getItem(`macos-win-${id}`) || "{}");
    localStorage.setItem(`macos-win-${id}`, JSON.stringify({ ...existing, ...data }));
  }

  restoreState() {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("macos-win-"));
    keys.forEach((key) => {
      const state = JSON.parse(localStorage.getItem(key));
      if (!state || !state.restoreOnLoad) return;
      $macEventBus.emit("app:launch", { id: state.appId, restore: true });
    });
  }

  constrainAll() {
    this.windows.forEach(({ el }) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        el.style.left = `${window.innerWidth - rect.width - 24}px`;
      }
      if (rect.bottom > window.innerHeight) {
        el.style.top = `${window.innerHeight - rect.height - 100}px`;
      }
      this.persistGeometry(el);
    });
  }
}

window.$macWindowManager = new WindowManager(document.getElementById("window-layer"));
