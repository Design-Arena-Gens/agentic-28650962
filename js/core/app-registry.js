class AppRegistry {
  constructor() {
    this.apps = {};
    $macEventBus.on("app:launch", ({ id, restore }) => this.launch(id, { restore }));
    $macEventBus.on("dock:launch", ({ appId }) => this.launch(appId));
    $macEventBus.on("window:created", ({ config }) => {
      if (config?.appId) {
        $macPreferences.set(`app-open-${config.appId}`, true);
        $macDock.setActive(config.appId, true);
      }
    });
    $macEventBus.on("window:closed", ({ appId }) => {
      if (!appId) return;
      const stillOpen = window.$macWindowManager.windows.some((w) => w.config?.appId === appId);
      if (!stillOpen) {
        $macPreferences.set(`app-open-${appId}`, false);
        $macDock.setActive(appId, false);
      }
    });
    this.restoreAutoLaunchApps();
  }

  register(appId, config) {
    this.apps[appId] = config;
    if (config.autoLaunch) {
      this.launch(appId, { restore: true });
    }
    if (config.dockIcon !== false) {
      $macDock.addIcon(appId, config);
    }
    if (config.rememberLastSession && $macPreferences.get(`app-open-${appId}`, false)) {
      this.launch(appId, { restore: true });
    }
  }

  async launch(appId, options = {}) {
    const app = this.apps[appId];
    if (!app) return;
    const existing = window.$macWindowManager.windows.find((w) => w.config.appId === appId);
    if (existing && !options.restore) {
      window.$macWindowManager.restoreWindow(existing.id);
      window.$macWindowManager.focusWindow(existing.id);
      return;
    }
    const instance = await app.create(options);
    const id = window.$macWindowManager.createWindow({
      id: instance.id,
      title: instance.title || app.title,
      width: instance.width || app.width || 640,
      height: instance.height || app.height || 480,
      appId,
      content: instance.content,
      toolbar: instance.toolbar || null,
    });
    const state = JSON.parse(localStorage.getItem(`macos-win-${id}`) || "{}");
    state.appId = appId;
    state.restoreOnLoad = true;
    localStorage.setItem(`macos-win-${id}`, JSON.stringify(state));
    $macDock.setActive(appId, true);
  }

  restoreAutoLaunchApps() {
    Object.entries(this.apps).forEach(([appId, config]) => {
      if (config.autoLaunch) {
        this.launch(appId, { restore: true });
      }
    });
  }
}

window.$macAppRegistry = new AppRegistry();
