class TooltipManager {
  constructor(root) {
    this.root = root;
    this.tooltip = null;
  }

  attach(target, message) {
    target.addEventListener("mouseenter", () => this.show(target, message));
    target.addEventListener("mouseleave", () => this.hide());
    target.addEventListener("focus", () => this.show(target, message));
    target.addEventListener("blur", () => this.hide());
  }

  show(target, message) {
    this.hide();
    this.tooltip = $mac.create("div", "tooltip", { text: message });
    this.root.appendChild(this.tooltip);
    requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const tipRect = this.tooltip.getBoundingClientRect();
      this.tooltip.style.left = `${rect.left + rect.width / 2 - tipRect.width / 2}px`;
      this.tooltip.style.top = `${Math.max(12, rect.top - tipRect.height - 12)}px`;
    });
  }

  hide() {
    if (!this.tooltip) return;
    this.tooltip.remove();
    this.tooltip = null;
  }
}

window.$macTooltips = new TooltipManager(document.getElementById("tooltips"));
