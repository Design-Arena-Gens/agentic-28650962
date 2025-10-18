class MissionControl {
  constructor(root) {
    this.root = root;
    this.visible = false;
    $macEventBus.on("mission-control:toggle", () => this.toggle());
    $macEventBus.on("window:created", () => this.refresh());
    $macEventBus.on("window:closed", () => this.refresh());
  }

  toggle() {
    this.visible = !this.visible;
    this.root.classList.toggle("hidden", !this.visible);
    if (this.visible) {
      this.refresh();
    }
  }

  refresh() {
    if (!this.visible) return;
    this.root.innerHTML = "";
    window.$macWindowManager.windows.forEach((win) => {
      const preview = $mac.create("div", "mission-window");
      const title = win.el.querySelector(".window-title");
      const label = $mac.create("h4", null, { text: title ? title.textContent : "Window" });
      preview.appendChild(label);
      preview.addEventListener("click", () => {
        this.toggle();
        window.$macWindowManager.restoreWindow(win.id);
        window.$macWindowManager.focusWindow(win.id);
      });
      this.root.appendChild(preview);
    });
  }
}

window.$macMissionControl = new MissionControl(document.getElementById("mission-control"));
