document.addEventListener("DOMContentLoaded", () => {
  const desktop = document.getElementById("desktop");

  desktop.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    $macContextMenu.show(
      [
        { label: "New Finder Window", action: () => $macEventBus.emit("app:launch", { id: "finder" }) },
        { label: "Mission Control", shortcut: "⌃↑", action: () => $macEventBus.emit("mission-control:toggle") },
        "separator",
        { label: "Change Desktop Background…", action: () => $macEventBus.emit("app:launch", { id: "preferences" }) },
      ],
      { x: event.pageX, y: event.pageY }
    );
  });

  // About dialog
  $macMenuBar.register("apple", "macOS WebOS", [
    {
      label: "About This WebOS",
      action: () =>
        $macDialogs.alert({
          title: "About",
          message: "macOS-inspired WebOS created with vanilla HTML, CSS, and JavaScript.",
        }),
    },
    "separator",
    {
      label: "System Preferences…",
      shortcut: "⌘,",
      action: () => $macEventBus.emit("app:launch", { id: "preferences" }),
    },
    "separator",
    { label: "Mission Control", shortcut: "⌃↑", action: () => $macEventBus.emit("mission-control:toggle") },
  ]);

  $macMenuBar.register("window", "Window", [
    { label: "Minimize", shortcut: "⌘M", action: () => minimizeActive() },
    { label: "Zoom", action: () => toggleActiveFullscreen() },
    "separator",
    { label: "Mission Control", shortcut: "⌃↑", action: () => $macEventBus.emit("mission-control:toggle") },
  ]);

  function minimizeActive() {
    const active = window.$macWindowManager.activeWindow;
    if (active) window.$macWindowManager.minimizeWindow(active);
  }

  function toggleActiveFullscreen() {
    const active = window.$macWindowManager.activeWindow;
    if (active) window.$macWindowManager.toggleFullscreen(active);
  }

  // Launch default apps
  $macEventBus.emit("app:launch", { id: "textedit" });
});
