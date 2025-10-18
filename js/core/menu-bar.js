class MenuBar {
  constructor(root) {
    this.root = root;
    this.activeMenu = null;
    this.menus = {};
    this.buildBase();
    this.tickClock();
    setInterval(() => this.tickClock(), 1000 * 30);
    document.addEventListener("click", (event) => {
      if (!this.root.contains(event.target)) {
        this.closeActiveMenu();
      }
    });
    $macEventBus.on("window:focused", ({ id }) => {
      const win = window.$macWindowManager.windows.find((w) => w.id === id);
      this.setActiveApp(win?.config?.appId || "global");
    });
    this.setActiveApp("global");
  }

  buildBase() {
    this.brandSection = $mac.create("div", ["menu-section", "brand"], { text: "" });
    this.menuSection = $mac.create("div", "menu-section");
    this.statusSection = $mac.create("div", "status-section");
    this.statusSection.appendChild(this.buildStatusIcon("wifi"));
    this.statusSection.appendChild(this.buildStatusIcon("battery"));
    this.statusClock = $mac.create("div", "status-clock");
    this.statusSection.appendChild(this.statusClock);
    this.root.append(this.brandSection, this.menuSection, this.statusSection);
  }

  buildStatusIcon(type) {
    return $mac.create("div", ["status-icon", type]);
  }

  tickClock() {
    const now = new Date();
    this.statusClock.textContent = now.toLocaleString("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  register(menuId, label, items, options = {}) {
    if (this.menus[menuId]) {
      this.menus[menuId].items = items;
      this.menus[menuId].label = label;
      this.menus[menuId].trigger.textContent = label;
      if (options.appId) {
        this.menus[menuId].appId = options.appId;
        this.menus[menuId].trigger.dataset.app = options.appId;
      }
      return;
    }
    const menuEl = $mac.create("div", ["menu-item"], { text: label });
    menuEl.dataset.menu = menuId;
    menuEl.dataset.app = options.appId || "global";
    this.menuSection.appendChild(menuEl);
    menuEl.addEventListener("click", (event) => {
      event.stopPropagation();
      if (this.activeMenu === menuId) {
        this.closeActiveMenu();
      } else {
        this.openMenu(menuId, items, menuEl);
      }
    });
    this.menus[menuId] = { label, items, trigger: menuEl, appId: options.appId || "global" };
  }

  openMenu(menuId, items, trigger) {
    this.closeActiveMenu();
    const menu = $mac.create("div", "menu-dropdown");
    menu.dataset.menu = menuId;
    items.forEach((item) => {
      if (item === "separator") {
        menu.appendChild($mac.create("div", "menu-dropdown-separator"));
        return;
      }
      const entry = $mac.create("div", "menu-dropdown-item");
      entry.textContent = item.label;
      if (item.shortcut) {
        const sc = $mac.create("span", null, { text: item.shortcut });
        entry.appendChild(sc);
      }
      entry.addEventListener("click", () => {
        this.closeActiveMenu();
        if (item.action) item.action();
      });
      menu.appendChild(entry);
    });
    this.root.appendChild(menu);
    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom - this.root.getBoundingClientRect().top}px`;
    trigger.classList.add("active");
    this.activeMenu = menuId;
  }

  closeActiveMenu() {
    if (!this.activeMenu) return;
    const dropdown = this.root.querySelector(`.menu-dropdown[data-menu="${this.activeMenu}"]`);
    if (dropdown) dropdown.remove();
    const trigger = this.root.querySelector(`.menu-item[data-menu="${this.activeMenu}"]`);
    if (trigger) trigger.classList.remove("active");
    this.activeMenu = null;
  }

  setActiveApp(appId) {
    this.activeApp = appId;
    Object.values(this.menus).forEach((menu) => {
      const isGlobal = menu.appId === "global";
      menu.trigger.style.display = isGlobal || menu.appId === appId ? "inline-flex" : "none";
    });
  }
}

window.$macMenuBar = new MenuBar(document.getElementById("menu-bar"));
