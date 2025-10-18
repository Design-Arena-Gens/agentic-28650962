class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const off = this.on(event, (...args) => {
      off();
      callback(...args);
    });
  }

  off(event, callback) {
    const set = this.listeners[event];
    if (!set) return;
    set.delete(callback);
    if (!set.size) {
      delete this.listeners[event];
    }
  }

  emit(event, payload) {
    const set = this.listeners[event];
    if (!set) return;
    set.forEach((cb) => cb(payload));
  }
}

window.$macEventBus = new EventBus();
