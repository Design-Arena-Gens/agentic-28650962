class FinderApp {
  constructor() {
    $macAppRegistry.register("finder", {
      title: "Finder",
      initials: "Find",
      width: 960,
      height: 620,
      autoLaunch: true,
      rememberLastSession: true,
      async create() {
        return FinderApp.createInstance();
      },
    });
  }

  static async createInstance() {
    const container = $mac.create("div", "finder");
    const sidebar = FinderApp.buildSidebar();
    const contentArea = $mac.create("div", "finder-column-view");
    const preview = FinderApp.buildPreview();

    container.append(sidebar, contentArea, preview.root);

    const finder = new FinderInstance(container, contentArea, preview);
    await finder.init();
    FinderApp.bindMenus(finder);

    return {
      id: `finder-${Date.now()}`,
      title: "Finder",
      content: container,
      toolbar: FinderApp.buildToolbar(finder),
    };
  }

  static bindMenus(finder) {
    $macMenuBar.register("finder", "Finder", [
      { label: "About Finder", action: () => $macDialogs.alert({ title: "Finder", message: "Finder keeps your files organized." }) },
      "separator",
      { label: "Preferences…", shortcut: "⌘,", action: () => $macEventBus.emit("app:launch", { id: "preferences" }) },
      "separator",
      { label: "Empty Trash…", action: () => $macDialogs.alert({ title: "Trash", message: "Trash is already empty." }) },
    ], { appId: "finder" });

    $macMenuBar.register("finder-go", "Go", [
      { label: "Home", shortcut: "⇧⌘H", action: () => finder.navigate("/") },
      { label: "Documents", shortcut: "⇧⌘O", action: () => finder.navigate("/Documents") },
      { label: "Downloads", shortcut: "⌥⌘L", action: () => finder.navigate("/Downloads") },
    ], { appId: "finder" });
  }

  static buildSidebar() {
    const sidebar = $mac.create("div", "finder-sidebar");
    const sections = [
      { label: "Favorites", items: ["Recents", "Desktop", "Documents", "Downloads"] },
      { label: "Devices", items: ["Workspace"] },
      { label: "Tags", items: ["Important", "Work", "Personal"] },
    ];
    sections.forEach((section) => {
      const sectionEl = $mac.create("div", "finder-sidebar-section");
      sectionEl.appendChild($mac.create("h3", null, { text: section.label }));
      section.items.forEach((item) => {
        const itemEl = $mac.create("div", "finder-sidebar-item", { text: item });
        sectionEl.appendChild(itemEl);
      });
      sidebar.appendChild(sectionEl);
    });
    return sidebar;
  }

  static buildPreview() {
    const root = $mac.create("div", "finder-preview");
    const title = $mac.create("h2", null, { text: "No Selection" });
    const meta = $mac.create("div", "meta", { text: "" });
    const previewContent = $mac.create("div", "content");
    root.append(title, meta, previewContent);
    return { root, title, meta, previewContent };
  }

  static buildToolbar(finder) {
    const toolbar = document.createDocumentFragment();
    const title = $mac.create("div", null, { text: "Finder" });
    const switcher = $mac.create("div", "finder-view-switch");
    ["Icon", "List", "Column"].forEach((mode) => {
      const button = $mac.create("button", "finder-view-button", { type: "button" });
      button.title = `${mode} View`;
      const view = mode.toLowerCase();
      button.dataset.view = view;
      button.addEventListener("click", () => finder.setView(view));
      finder.registerViewButton(view, button);
      switcher.appendChild(button);
    });
    toolbar.append(title, switcher);
    return toolbar;
  }
}

class FinderInstance {
  constructor(root, contentArea, preview) {
    this.root = root;
    this.contentArea = contentArea;
    this.preview = preview;
    this.currentPath = "/";
    this.columns = [];
    this.viewMode = $macPreferences.get("finder-view-mode", "column");
    this.viewButtons = {};
  }

  async init() {
    await new Promise((resolve) => $macFileSystem.subscribe(() => resolve()));
    this.render();
  }

  setView(mode) {
    this.viewMode = mode;
    $macPreferences.set("finder-view-mode", mode);
    this.render();
  }

  registerViewButton(view, button) {
    this.viewButtons[view] = button;
    this.updateViewButtons();
  }

  updateViewButtons() {
    Object.entries(this.viewButtons).forEach(([view, button]) => {
      button.classList.toggle("active", view === this.viewMode);
    });
  }

  render() {
    this.contentArea.innerHTML = "";
    this.contentArea.className = "";
    switch (this.viewMode) {
      case "icon":
        this.renderIconView();
        break;
      case "list":
        this.renderListView();
        break;
      default:
        this.renderColumnView();
        break;
    }
    this.updateViewButtons();
  }

  navigate(path) {
    const node = $macFileSystem.find(path);
    if (node && node.type === "directory") {
      this.currentPath = path;
      this.render();
    } else {
      $macDialogs.alert({ title: "Finder", message: "Folder not found." });
    }
  }

  getPathNodes() {
    const pathParts = this.currentPath.split("/").filter(Boolean);
    const nodes = [];
    const rootNode = $macFileSystem.structure;
    nodes.push(rootNode);
    pathParts.forEach((part) => {
      const node = nodes[nodes.length - 1];
      const child = node.children?.find((item) => item.name === part);
      if (child) {
        nodes.push(child);
      }
    });
    return nodes;
  }

  renderColumnView() {
    this.contentArea.classList.add("finder-column-view");
    const nodes = this.getPathNodes();
    nodes.forEach((node, index) => {
      const column = $mac.create("div", "finder-column");
      node.children
        ?.filter((child) => child)
        .forEach((child) => {
          const item = $mac.create("div", "finder-column-item", { text: child.name });
          const segments = nodes.slice(1, index).map((n) => n.name);
          const path = `/${[...segments, child.name].filter(Boolean).join("/")}`;
          item.dataset.path = path;
          item.addEventListener("click", () => {
            if (child.type === "directory") {
              this.currentPath = item.dataset.path;
              this.render();
            } else {
              this.previewFile(child);
            }
          });
          item.addEventListener("contextmenu", (event) => this.showContextMenu(event, child, path));
          column.appendChild(item);
        });
      this.contentArea.appendChild(column);
    });
  }

  renderIconView() {
    this.contentArea.classList.add("finder-icon-grid");
    const node = $macFileSystem.find(this.currentPath) || $macFileSystem.structure;
    node.children?.forEach((child) => {
      const icon = $mac.create("div", "finder-icon");
      const artwork = $mac.create("div", "icon");
      artwork.classList.add(child.type === "directory" ? "folder" : "document");
      const label = $mac.create("div", "label", { text: child.name });
      icon.append(artwork, label);
      const path = `${this.currentPath.replace(/\/$/, "")}/${child.name}`.replace(/\/+/g, "/");
      icon.addEventListener("click", () => {
        if (child.type === "directory") {
          this.currentPath = path;
          this.render();
        } else {
          this.previewFile(child);
        }
      });
      icon.addEventListener("contextmenu", (event) => this.showContextMenu(event, child, path));
      this.contentArea.appendChild(icon);
    });
  }

  renderListView() {
    this.contentArea.classList.add("finder-list-view");
    const table = $mac.create("table", "finder-list-table");
    const thead = $mac.create("thead");
    const headerRow = $mac.create("tr");
    ["Name", "Date Modified", "Size", "Kind"].forEach((label) => {
      headerRow.appendChild($mac.create("th", null, { text: label }));
    });
    thead.appendChild(headerRow);
    const tbody = $mac.create("tbody");
    const node = $macFileSystem.find(this.currentPath) || $macFileSystem.structure;
    node.children?.forEach((child) => {
      const row = $mac.create("tr");
      row.appendChild($mac.create("td", null, { text: child.name }));
      row.appendChild(
        $mac.create("td", null, {
          text: new Date(child.modified || Date.now()).toLocaleString(),
        })
      );
      row.appendChild(
        $mac.create("td", null, {
          text: child.type === "file" ? $mac.formatBytes(child.size || 0) : "--",
        })
      );
      row.appendChild($mac.create("td", null, { text: child.type === "file" ? "Document" : "Folder" }));
      const path = `${this.currentPath.replace(/\/$/, "")}/${child.name}`.replace(/\/+/g, "/");
      row.addEventListener("click", () => {
        if (child.type === "directory") {
          this.currentPath = path;
          this.render();
        } else {
          this.previewFile(child);
        }
      });
      row.addEventListener("contextmenu", (event) => this.showContextMenu(event, child, path));
      tbody.appendChild(row);
    });
    table.append(thead, tbody);
    this.contentArea.appendChild(table);
  }

  showContextMenu(event, node, path) {
    event.preventDefault();
    $macContextMenu.show(
      [
        { label: "Open", action: () => this.openNode(node, path) },
        { label: "Quick Look", action: () => this.quickLook(node) },
        { label: "Get Info", action: () => this.showInfo(node, path) },
        "separator",
        { label: "Delete", action: () => this.deleteNode(path) },
      ],
      { x: event.pageX, y: event.pageY }
    );
  }

  openNode(node, path) {
    if (node.type === "directory") {
      this.currentPath = path;
      this.render();
    } else {
      this.previewFile(node);
    }
  }

  quickLook(node) {
    $macDialogs.alert({
      title: node.name,
      message: node.content ? node.content.slice(0, 240) : "No preview available.",
    });
  }

  showInfo(node, path) {
    const details = [
      `Kind: ${node.type === "file" ? "Document" : "Folder"}`,
      `Size: ${node.type === "file" ? $mac.formatBytes(node.size || 0) : "--"}`,
      `Created: ${new Date(node.created || Date.now()).toLocaleString()}`,
      `Modified: ${new Date(node.modified || Date.now()).toLocaleString()}`,
      `Path: ${path}`,
    ].join("\n");

    $macDialogs.alert({ title: `${node.name} Info`, message: details });
  }

  deleteNode(path) {
    $macDialogs
      .alert({
        title: "Delete",
        message: "Are you sure you want to move this item to Trash?",
        buttons: [
          { label: "Cancel", role: "cancel" },
          { label: "Delete", role: "delete", primary: true },
        ],
      })
      .then((role) => {
        if (role === "delete") {
          if ($macFileSystem.delete(path)) {
            this.render();
            this.preview.title.textContent = "No Selection";
            this.preview.meta.textContent = "";
            this.preview.previewContent.textContent = "";
          }
        }
      });
  }

  previewFile(node) {
    this.preview.title.textContent = node.name;
    this.preview.meta.textContent = `${node.type.toUpperCase()} • ${$mac.formatBytes(node.size || 0)} • Modified ${new Date(
      node.modified || Date.now()
    ).toLocaleString()}`;
    this.preview.previewContent.textContent = node.content ? node.content.slice(0, 200) : "No preview available.";
  }
}

new FinderApp();
