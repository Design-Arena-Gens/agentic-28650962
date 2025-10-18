class VirtualFileSystem {
  constructor() {
    this.structure = null;
    this.listeners = new Set();
    this.load();
  }

  async load() {
    try {
      const response = await fetch("data/fs.json");
      const json = await response.json();
      this.structure = json;
      this.notify();
    } catch (error) {
      console.error("Failed to load filesystem", error);
      this.structure = { name: "root", type: "directory", children: [] };
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (this.structure) callback(this.structure);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.structure));
  }

  find(path) {
    const parts = path.replace(/^\/+/, "").split("/").filter(Boolean);
    let node = this.structure;
    for (const part of parts) {
      if (!node.children) return null;
      node = node.children.find((child) => child.name === part);
      if (!node) return null;
    }
    return node;
  }

  createFile(path, content = "") {
    const parts = path.replace(/^\/+/, "").split("/").filter(Boolean);
    const fileName = parts.pop();
    const parentPath = parts.length ? `/${parts.join("/")}` : "/";
    const parent = this.find(parentPath);
    if (!parent || parent.type !== "directory") return null;
    const existing = parent.children.find((child) => child.name === fileName);
    if (existing) {
      existing.content = content;
      existing.modified = new Date().toISOString();
      this.notify();
      return existing;
    }
    const file = {
      name: fileName,
      type: "file",
      size: content.length,
      content,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
    parent.children.push(file);
    this.notify();
    return file;
  }

  updateFile(path, content) {
    const file = this.find(path);
    if (!file || file.type !== "file") return;
    file.content = content;
    file.modified = new Date().toISOString();
    file.size = content.length;
    this.notify();
  }

  delete(path) {
    const parts = path.replace(/^\/+/g, "").split("/").filter(Boolean);
    const name = parts.pop();
    const parentPath = parts.length ? `/${parts.join("/")}` : "/";
    const parent = this.find(parentPath);
    if (!parent || parent.type !== "directory" || !parent.children) return false;
    const index = parent.children.findIndex((child) => child.name === name);
    if (index === -1) return false;
    parent.children.splice(index, 1);
    this.notify();
    return true;
  }
}

window.$macFileSystem = new VirtualFileSystem();
