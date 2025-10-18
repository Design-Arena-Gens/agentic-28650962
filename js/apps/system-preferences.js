class SystemPreferencesApp {
  constructor() {
    $macAppRegistry.register("preferences", {
      title: "System Preferences",
      initials: "Pref",
      width: 800,
      height: 560,
      rememberLastSession: true,
      async create() {
        return SystemPreferencesApp.createInstance();
      },
    });
  }

  static createInstance() {
    const container = $mac.create("div", "preferences");
    const sidebar = $mac.create("div", "preferences-sidebar");
    const sections = [
      { id: "general", label: "General" },
      { id: "desktop", label: "Desktop & Screen Saver" },
      { id: "dock", label: "Dock & Menu Bar" },
      { id: "keyboard", label: "Keyboard" },
    ];
    sections.forEach((section, index) => {
      const item = $mac.create("div", "preferences-sidebar-item", { text: section.label });
      item.dataset.section = section.id;
      if (index === 0) item.classList.add("active");
      item.addEventListener("click", () => {
        sidebar.querySelectorAll(".preferences-sidebar-item").forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        prefs.showSection(section.id);
      });
      sidebar.appendChild(item);
    });

    const content = $mac.create("div", "preferences-content");
    const prefs = new PreferencesInstance(content);

    container.append(sidebar, content);
    prefs.showSection("general");

    return {
      id: `preferences-${Date.now()}`,
      title: "System Preferences",
      content: container,
    };
  }
}

class PreferencesInstance {
  constructor(content) {
    this.content = content;
  }

  showSection(sectionId) {
    this.content.innerHTML = "";
    const section = $mac.create("div", "preferences-section");
    switch (sectionId) {
      case "general":
        this.renderGeneral(section);
        break;
      case "desktop":
        this.renderDesktop(section);
        break;
      case "dock":
        this.renderDock(section);
        break;
      case "keyboard":
        this.renderKeyboard(section);
        break;
      default:
        break;
    }
    this.content.appendChild(section);
  }

  renderGeneral(section) {
    section.appendChild($mac.create("h2", null, { text: "Appearance" }));
    section.appendChild(this.makeToggle("mac-appearance-dark", "Dark menu bar and Dock", (value) => {
      document.body.classList.toggle("dark-mode", value);
    }));
    section.appendChild(this.makeToggle("mac-appearance-auto", "Automatically switch appearance", (value) => {
      $macPreferences.set("appearance-auto", value);
    }));
  }

  renderDesktop(section) {
    section.appendChild($mac.create("h2", null, { text: "Desktop & Screen Saver" }));
    const slider = this.makeSlider("desktop-blur", "Desktop vibrancy", $macPreferences.get("desktop-blur", 30), (value) => {
      document.getElementById("desktop").style.backdropFilter = `blur(${value}px) saturate(180%)`;
      $macPreferences.set("desktop-blur", value);
    });
    section.appendChild(slider);
  }

  renderDock(section) {
    section.appendChild($mac.create("h2", null, { text: "Dock & Menu Bar" }));
    section.appendChild(this.makeSlider("dock-size", "Dock size", $macPreferences.get("dock-size", 64), (value) => {
      document.querySelectorAll(".dock-icon").forEach((icon) => {
        icon.style.width = `${value}px`;
        icon.style.height = `${value}px`;
      });
      $macPreferences.set("dock-size", value);
    }));
    section.appendChild(this.makeToggle("dock-magnification", "Magnification", (value) => {
      $macPreferences.set("dock-magnification", value);
    }, true));
  }

  renderKeyboard(section) {
    section.appendChild($mac.create("h2", null, { text: "Keyboard Shortcuts" }));
    section.appendChild($mac.create("p", null, { text: "Standard macOS shortcuts are available across apps." }));
  }

  makeToggle(key, label, onChange, defaultValue = false) {
    const control = $mac.create("div", "preferences-control");
    const checkbox = $mac.create("input", null, { type: "checkbox" });
    checkbox.checked = $macPreferences.get(key, defaultValue);
    checkbox.addEventListener("change", () => {
      $macPreferences.set(key, checkbox.checked);
      onChange(checkbox.checked);
    });
    const text = $mac.create("label", null, { text: label });
    control.append(text, checkbox);
    onChange(checkbox.checked);
    return control;
  }

  makeSlider(key, label, value, onChange) {
    const control = $mac.create("div", "preferences-control");
    const slider = $mac.create("input", null, { type: "range", min: "40", max: "96", value });
    slider.addEventListener("input", () => {
      onChange(Number(slider.value));
    });
    const text = $mac.create("label", null, { text: label });
    control.append(text, slider);
    onChange(Number(value));
    return control;
  }
}

new SystemPreferencesApp();
