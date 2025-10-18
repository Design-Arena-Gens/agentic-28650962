class ContextMenu {
  constructor(root) {
    this.root = root;
    this.items = [];
    document.addEventListener("click", () => this.hide());
  }

  show(items, position) {
    this.root.innerHTML = "";
    items.forEach((item) => {
      if (item === "separator") {
        this.root.appendChild($mac.create("div", "menu-dropdown-separator"));
        return;
      }
      const entry = $mac.create("div", "context-menu-item");
      entry.textContent = item.label;
      if (item.shortcut) {
        const sc = $mac.create("span", null, { text: item.shortcut });
        entry.appendChild(sc);
      }
      entry.addEventListener("click", (event) => {
        event.stopPropagation();
        this.hide();
        if (item.action) item.action();
      });
      this.root.appendChild(entry);
    });
    this.root.style.left = `${position.x}px`;
    this.root.style.top = `${position.y}px`;
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
  }
}

window.$macContextMenu = new ContextMenu(document.getElementById("context-menu"));
