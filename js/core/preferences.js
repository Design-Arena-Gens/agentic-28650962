class PreferencesStore {
  constructor(namespace = "macos-webos") {
    this.namespace = namespace;
    this.cache = JSON.parse(localStorage.getItem(this.namespace) || "{}");
  }

  get(key, defaultValue) {
    return this.cache[key] ?? defaultValue;
  }

  set(key, value) {
    this.cache[key] = value;
    localStorage.setItem(this.namespace, JSON.stringify(this.cache));
    $macEventBus.emit("preferences:changed", { key, value });
  }
}

window.$macPreferences = new PreferencesStore();
