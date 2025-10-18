class TerminalApp {
  constructor() {
    $macAppRegistry.register("terminal", {
      title: "Terminal",
      initials: "Term",
      width: 760,
      height: 520,
      rememberLastSession: true,
      async create() {
        return TerminalApp.createInstance();
      },
    });
  }

  static createInstance() {
    const container = $mac.create("div", "terminal");
    const screen = $mac.create("div", "terminal-screen");
    const inputBar = $mac.create("div", "terminal-input");
    const promptSpan = $mac.create("span", null, { text: TerminalApp.prompt() });
    const input = $mac.create("input");
    input.setAttribute("aria-label", "Terminal input");
    inputBar.append(promptSpan, input);
    container.append(screen, inputBar);

    const terminal = new TerminalInstance(screen, input, promptSpan);
    terminal.print(`Last login: ${new Date().toLocaleString()}`);
    terminal.print(`Welcome to macOS WebOS terminal.\nType 'help' for available commands.`);

    return {
      id: `terminal-${Date.now()}`,
      title: "Terminal",
      content: container,
    };
  }

  static prompt() {
    return `user@macos-webos ${TerminalApp.cwd || "~"} % `;
  }
}

class TerminalInstance {
  constructor(screen, input, promptSpan) {
    this.screen = screen;
    this.input = input;
    this.promptSpan = promptSpan;
    this.cwd = "/";
    TerminalApp.cwd = this.cwd;
    this.promptSpan.textContent = TerminalApp.prompt();
    this.history = [];
    this.historyIndex = 0;
    this.commands = this.buildCommands();
    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const command = this.input.value.trim();
        this.history.push(command);
        this.historyIndex = this.history.length;
        this.print(`${this.promptSpan.textContent}${command}`);
        this.execute(command);
        this.input.value = "";
      } else if (event.key === "ArrowUp") {
        if (this.historyIndex > 0) this.historyIndex -= 1;
        this.input.value = this.history[this.historyIndex] || "";
        event.preventDefault();
      } else if (event.key === "ArrowDown") {
        if (this.historyIndex < this.history.length) this.historyIndex += 1;
        this.input.value = this.history[this.historyIndex] || "";
        event.preventDefault();
      }
    });
  }

  print(text) {
    this.screen.textContent += `${text}\n`;
    this.screen.scrollTop = this.screen.scrollHeight;
  }

  execute(commandLine) {
    const [command, ...args] = commandLine.split(" ").filter(Boolean);
    if (!command) return;
    const handler = this.commands[command];
    if (handler) {
      handler(args);
    } else {
      this.print(`zsh: command not found: ${command}`);
    }
  }

  buildCommands() {
    return {
      clear: () => {
        this.screen.textContent = "";
      },
      help: () => {
        this.print("Available commands: clear, help, ls, pwd, cat, open, say, date, whoami, uptime");
      },
      ls: () => {
        const node = $macFileSystem.find(this.cwd);
        if (!node || node.type !== "directory") {
          this.print("Error accessing directory.");
          return;
        }
        const names = node.children?.map((child) => child.name) || [];
        this.print(names.join("    "));
      },
      pwd: () => {
        this.print(this.cwd);
      },
      cat: (args) => {
        if (!args.length) {
          this.print("Usage: cat <file>");
          return;
        }
        const path = this.resolvePath(args[0]);
        const file = $macFileSystem.find(path);
        if (!file || file.type !== "file") {
          this.print(`cat: ${args[0]}: No such file`);
          return;
        }
        this.print(file.content || "");
      },
      open: (args) => {
        if (!args.length) {
          this.print("Usage: open <app>");
          return;
        }
        const app = args[0].toLowerCase();
        $macEventBus.emit("app:launch", { id: app });
        this.print(`Opening ${app}...`);
      },
      say: (args) => {
        this.print(args.join(" "));
      },
      date: () => {
        this.print(new Date().toString());
      },
      whoami: () => {
        this.print("user");
      },
      uptime: () => {
        const uptime = Math.floor(performance.now() / 1000);
        this.print(`up ${uptime} seconds`);
      },
      cd: (args) => {
        if (!args.length) {
          this.cwd = "/";
          this.promptSpan.textContent = TerminalApp.prompt();
          return;
        }
        const target = this.resolvePath(args[0]);
        const node = $macFileSystem.find(target);
        if (!node || node.type !== "directory") {
          this.print(`cd: no such file or directory: ${args[0]}`);
          return;
        }
        this.cwd = target;
        TerminalApp.cwd = target;
        this.promptSpan.textContent = TerminalApp.prompt();
      },
    };
  }

  resolvePath(path) {
    if (path.startsWith("/")) return path;
    const stack = this.cwd.split("/").filter(Boolean);
    path.split("/").forEach((segment) => {
      if (segment === "..") {
        stack.pop();
      } else if (segment !== "." && segment) {
        stack.push(segment);
      }
    });
    return `/${stack.join("/")}`;
  }
}

new TerminalApp();
