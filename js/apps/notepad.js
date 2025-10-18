class TextEditApp {
  constructor() {
    $macAppRegistry.register("textedit", {
      title: "TextEdit",
      initials: "Txt",
      width: 720,
      height: 520,
      rememberLastSession: true,
      async create() {
        return TextEditApp.createInstance();
      },
    });
  }

  static createInstance() {
    const container = $mac.create("div", "textedit");
    const toolbar = TextEditApp.createToolbar();
    const editor = $mac.create("div", "textedit-editor", { contenteditable: "true" });
    editor.dataset.filename = "Untitled";
    editor.innerHTML = $macPreferences.get("textedit-last-doc", "");

    toolbar.editor = editor;
    container.append(toolbar, editor);
    TextEditApp.bindEditor(editor);
    TextEditApp.bindMenu(editor);

    return {
      id: `textedit-${Date.now()}`,
      title: editor.dataset.filename,
      content: container,
      toolbar,
    };
  }

  static createToolbar() {
    const toolbar = $mac.create("div", "textedit-toolbar");
    const fontSelect = $mac.create("select");
    ["San Francisco", "Helvetica", "Times New Roman", "Courier"].forEach((font) => {
      const option = $mac.create("option", null, { text: font });
      option.value = font;
      fontSelect.appendChild(option);
    });

    fontSelect.addEventListener("change", (event) => {
      document.execCommand("fontName", false, event.target.value);
    });

    const sizeSelect = $mac.create("select");
    [12, 14, 16, 18, 24, 32].forEach((size) => {
      const option = $mac.create("option", null, { text: `${size} pt` });
      option.value = size;
      sizeSelect.appendChild(option);
    });
    sizeSelect.addEventListener("change", (event) => {
      document.execCommand("fontSize", false, "7");
      const editor = toolbar.editor;
      if (!editor) return;
      editor.querySelectorAll("font[size='7']").forEach((el) => {
        el.removeAttribute("size");
        el.style.fontSize = `${event.target.value}px`;
      });
    });

    const boldBtn = TextEditApp.createButton("Bold", () => document.execCommand("bold"));
    const italicBtn = TextEditApp.createButton("Italic", () => document.execCommand("italic"));
    const underlineBtn = TextEditApp.createButton("Underline", () => document.execCommand("underline"));

    toolbar.append(fontSelect, sizeSelect, boldBtn, italicBtn, underlineBtn);
    return toolbar;
  }

  static createButton(label, action) {
    const button = $mac.create("button", null, { text: label, type: "button" });
    button.addEventListener("click", action);
    return button;
  }

  static bindEditor(editor) {
    editor.addEventListener("input", () => {
      $macPreferences.set("textedit-last-doc", editor.innerHTML);
    });
    editor.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      $macContextMenu.show(
        [
          { label: "Cut", action: () => document.execCommand("cut") },
          { label: "Copy", action: () => document.execCommand("copy") },
          { label: "Paste", action: () => document.execCommand("paste") },
          "separator",
          { label: "Select All", action: () => document.execCommand("selectAll") },
        ],
        { x: event.pageX, y: event.pageY }
      );
    });
  }

  static bindMenu(editor) {
    $macMenuBar.register("textedit-file", "File", [
      { label: "New", shortcut: "⌘N", action: () => TextEditApp.newDocument(editor) },
      { label: "Open…", shortcut: "⌘O", action: () => TextEditApp.openDialog(editor) },
      { label: "Save…", shortcut: "⌘S", action: () => TextEditApp.saveDialog(editor) },
      "separator",
      { label: "Close", shortcut: "⌘W", action: () => window.$macWindowManager.closeWindow(editor.closest(".window").dataset.id) },
    ], { appId: "textedit" });

    $macMenuBar.register("textedit-format", "Format", [
      { label: "Bold", shortcut: "⌘B", action: () => document.execCommand("bold") },
      { label: "Italic", shortcut: "⌘I", action: () => document.execCommand("italic") },
      { label: "Underline", shortcut: "⌘U", action: () => document.execCommand("underline") },
      "separator",
      { label: "Show Fonts…", action: () => TextEditApp.fontDialog(editor) },
    ], { appId: "textedit" });
  }

  static newDocument(editor) {
    editor.innerHTML = "";
    editor.dataset.filename = "Untitled";
  }

  static openDialog(editor) {
    $macDialogs.alert({
      title: "Open Document",
      message: "File dialogues are simulated. Select a document from Finder to open.",
    });
  }

  static saveDialog(editor) {
    $macDialogs
      .alert({
        title: "Save Document",
        message: "Enter a filename in the prompt.",
        buttons: [
          { label: "Cancel", role: "cancel" },
          { label: "Save", role: "ok", primary: true },
        ],
      })
      .then((role) => {
        if (role === "ok") {
          const path = `/Documents/${editor.dataset.filename || "Untitled"}.txt`;
          $macFileSystem.createFile(path, editor.textContent);
        }
      });
  }

  static fontDialog(editor) {
    $macDialogs.alert({
      title: "Fonts",
      message: "Use the toolbar to change fonts and typography.",
    });
  }
}

new TextEditApp();
