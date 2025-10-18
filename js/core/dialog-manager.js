class DialogManager {
  constructor(root) {
    this.root = root;
  }

  alert({ title, message, buttons = [{ label: "OK", role: "cancel" }] }) {
    return new Promise((resolve) => {
      const dialog = $mac.create("div", "dialog");
      dialog.appendChild($mac.create("h1", null, { text: title }));
      if (message) {
        dialog.appendChild($mac.create("p", null, { text: message }));
      }
      const actions = $mac.create("div", "dialog-actions");
      buttons.forEach((button) => {
        const btn = $mac.create("button", ["mac-button", button.primary ? "primary" : ""].filter(Boolean), {
          text: button.label,
          type: "button",
        });
        btn.addEventListener("click", () => {
          dialog.remove();
          resolve(button.role || "ok");
        });
        actions.appendChild(btn);
      });
      dialog.appendChild(actions);
      dialog.style.left = "50%";
      dialog.style.top = "50%";
      dialog.style.transform = "translate(-50%, -50%)";
      this.root.appendChild(dialog);
      dialog.focus();
    });
  }
}

window.$macDialogs = new DialogManager(document.getElementById("dialogs"));
