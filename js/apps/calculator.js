class CalculatorApp {
  constructor() {
    this.id = "calculator";
    $macAppRegistry.register(this.id, {
      title: "Calculator",
      initials: "Calc",
      width: 480,
      height: 520,
      rememberLastSession: true,
      async create() {
        return CalculatorApp.createInstance();
      },
    });
  }

  static createInstance() {
    const container = $mac.create("div", "calculator");
    const display = $mac.create("div", "calculator-display", { text: "0" });
    const pad = $mac.create("div", "calculator-pad");
    const scientific = $mac.create("div", "calculator-scientific");
    container.append(display, pad, scientific);

    const calc = new CalculatorLogic(display, container, scientific);
    calc.buildPad(pad);
    calc.buildScientific(scientific);
    calc.bindKeyboard();
    calc.applyInitialState();

    return {
      id: `calculator-${Date.now()}`,
      title: "Calculator",
      width: 480,
      height: 520,
      content: container,
    };
  }
}

class CalculatorLogic {
  constructor(display, container, scientificPane) {
    this.display = display;
    this.container = container;
    this.scientificPane = scientificPane;
    this.controls = {};
    this.current = "0";
    this.operator = null;
    this.operand = null;
    this.degrees = $macPreferences.get("calculator-degrees", true);
    this.hyperbolic = $macPreferences.get("calculator-hyperbolic", false);
    this.scientificVisible = $macPreferences.get("calculator-scientific", true);
  }

  buildPad(root) {
    const keys = [
      { label: "AC", type: "function", action: () => this.clear() },
      { label: "±", type: "function", action: () => this.toggleSign() },
      { label: "%", type: "function", action: () => this.percent() },
      { label: "÷", type: "operator", action: () => this.setOperator("divide") },
      { label: "7", action: () => this.append("7") },
      { label: "8", action: () => this.append("8") },
      { label: "9", action: () => this.append("9") },
      { label: "×", type: "operator", action: () => this.setOperator("multiply") },
      { label: "4", action: () => this.append("4") },
      { label: "5", action: () => this.append("5") },
      { label: "6", action: () => this.append("6") },
      { label: "-", type: "operator", action: () => this.setOperator("subtract") },
      { label: "1", action: () => this.append("1") },
      { label: "2", action: () => this.append("2") },
      { label: "3", action: () => this.append("3") },
      { label: "+", type: "operator", action: () => this.setOperator("add") },
      { label: "0", action: () => this.append("0"), span: 2 },
      { label: ".", action: () => this.append(".") },
      { label: "=", type: "operator", action: () => this.evaluate() },
    ];

    keys.forEach((key) => {
      const button = $mac.create("button", ["calc-key", key.type || ""].filter(Boolean), { text: key.label });
      button.addEventListener("click", () => key.action());
      if (key.label === "0") {
        button.style.gridColumn = "span 2";
      }
      root.appendChild(button);
    });
  }

  buildScientific(root) {
    const keys = [
      { label: "2nd", id: "second", action: () => this.toggleScientific() },
      { label: "π", action: () => this.insertValue(Math.PI) },
      { label: "e", action: () => this.insertValue(Math.E) },
      { label: "sin", action: () => this.applyTrig("sin") },
      { label: "cos", action: () => this.applyTrig("cos") },
      { label: "tan", action: () => this.applyTrig("tan") },
      { label: "log", action: () => this.applyUnary(Math.log10) },
      { label: "ln", action: () => this.applyUnary(Math.log) },
      { label: "√x", action: () => this.applyUnary(Math.sqrt) },
      { label: "x²", action: () => this.applyUnary((x) => x * x) },
      { label: "x³", action: () => this.applyUnary((x) => x * x * x) },
      { label: "xⁿ", action: () => this.raisePower() },
      { label: "n!", action: () => this.applyUnary(CalculatorLogic.factorial) },
      { label: "1/x", action: () => this.applyUnary((x) => 1 / x) },
      { label: "Rand", action: () => this.insertValue(Math.random()) },
      { label: "Deg", id: "degrees", action: () => this.toggleDegrees() },
      { label: "Hyp", id: "hyperbolic", action: () => this.toggleHyperbolic() },
    ];

    keys.forEach((key) => {
      const button = $mac.create("button", ["calc-key", "function"], { text: key.label });
      button.addEventListener("click", () => key.action());
      if (key.id) {
        this.controls[key.id] = button;
      }
      root.appendChild(button);
    });
  }

  static factorial(n) {
    const x = Math.floor(n);
    if (x < 0) return NaN;
    if (x === 0 || x === 1) return 1;
    let total = 1;
    for (let i = 2; i <= x; i += 1) {
      total *= i;
    }
    return total;
  }

  updateDisplay(value = this.current) {
    this.display.textContent = value.toString().slice(0, 16);
  }

  clear() {
    this.current = "0";
    this.operator = null;
    this.operand = null;
    this.updateDisplay();
  }

  append(char) {
    if (char === "." && this.current.includes(".")) return;
    if (this.current === "0" && char !== ".") {
      this.current = char;
    } else {
      this.current += char;
    }
    this.updateDisplay();
  }

  toggleSign() {
    if (this.current.startsWith("-")) {
      this.current = this.current.slice(1);
    } else {
      this.current = `-${this.current}`;
    }
    this.updateDisplay();
  }

  percent() {
    const value = parseFloat(this.current || "0") / 100;
    this.current = value.toString();
    this.updateDisplay();
  }

  setOperator(op) {
    this.evaluate();
    this.operator = op;
    this.operand = parseFloat(this.current);
    this.current = "0";
  }

  evaluate() {
    if (!this.operator || this.operand === null) return;
    const currentValue = parseFloat(this.current);
    let result = currentValue;
    switch (this.operator) {
      case "add":
        result = this.operand + currentValue;
        break;
      case "subtract":
        result = this.operand - currentValue;
        break;
      case "multiply":
        result = this.operand * currentValue;
        break;
      case "divide":
        result = this.operand / currentValue;
        break;
      default:
        break;
    }
    this.current = result.toString();
    this.operator = null;
    this.operand = null;
    this.updateDisplay();
  }

  insertValue(value) {
    this.current = value.toString();
    this.updateDisplay();
  }

  applyUnary(fn) {
    const value = parseFloat(this.current);
    this.setResult(fn(value));
  }

  applyTrig(type) {
    const value = parseFloat(this.current);
    const angle = this.degrees ? (value * Math.PI) / 180 : value;
    const standard = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
    const hyper = { sin: Math.sinh, cos: Math.cosh, tan: Math.tanh };
    const fnMap = this.hyperbolic ? hyper : standard;
    this.setResult(fnMap[type](angle));
  }

  setResult(result) {
    if (!Number.isNaN(result) && Number.isFinite(result)) {
      this.current = result.toString();
      this.updateDisplay();
    }
  }

  raisePower() {
    if (this.operand === null) {
      this.operand = parseFloat(this.current);
      this.operator = "power";
      this.current = "0";
    } else {
      const exponent = parseFloat(this.current);
      const result = Math.pow(this.operand, exponent);
      this.current = result.toString();
      this.operator = null;
      this.operand = null;
      this.updateDisplay();
    }
  }

  toggleScientific() {
    this.scientificVisible = !this.scientificVisible;
    this.scientificPane.style.display = this.scientificVisible ? "grid" : "none";
    this.container.classList.toggle("scientific-hidden", !this.scientificVisible);
    $macPreferences.set("calculator-scientific", this.scientificVisible);
  }

  toggleDegrees() {
    this.degrees = !this.degrees;
    $macPreferences.set("calculator-degrees", this.degrees);
    const button = this.controls.degrees;
    if (button) {
      button.textContent = this.degrees ? "Deg" : "Rad";
      button.classList.toggle("active", !this.degrees);
    }
  }

  toggleHyperbolic() {
    this.hyperbolic = !this.hyperbolic;
    $macPreferences.set("calculator-hyperbolic", this.hyperbolic);
    const button = this.controls.hyperbolic;
    if (button) {
      button.classList.toggle("active", this.hyperbolic);
    }
  }

  bindKeyboard() {
    document.addEventListener("keydown", (event) => {
      if (event.metaKey && event.key.toLowerCase() === "c") {
        navigator.clipboard?.writeText(this.display.textContent || "");
        return;
      }
      if (event.metaKey && event.key.toLowerCase() === "v") {
        navigator.clipboard
          ?.readText()
          .then((text) => {
            if (!Number.isNaN(Number(text))) {
              this.current = text;
              this.updateDisplay();
            }
          })
          .catch(() => {});
        return;
      }
      if (event.metaKey && event.key.toLowerCase() === "f") {
        this.toggleScientific();
        return;
      }
      if (/\d/.test(event.key)) {
        this.append(event.key);
      } else if (event.key === ".") {
        this.append(".");
      } else if (event.key === "Enter") {
        this.evaluate();
      } else if (event.key === "Escape") {
        this.clear();
      } else if (event.key === "+") {
        this.setOperator("add");
      } else if (event.key === "-") {
        this.setOperator("subtract");
      } else if (event.key === "*") {
        this.setOperator("multiply");
      } else if (event.key === "/") {
        this.setOperator("divide");
      }
    });
  }

  applyInitialState() {
    this.scientificPane.style.display = this.scientificVisible ? "grid" : "none";
    this.container.classList.toggle("scientific-hidden", !this.scientificVisible);
    const degButton = this.controls.degrees;
    if (degButton) {
      degButton.textContent = this.degrees ? "Deg" : "Rad";
      degButton.classList.toggle("active", !this.degrees);
    }
    const hypButton = this.controls.hyperbolic;
    if (hypButton) {
      hypButton.classList.toggle("active", this.hyperbolic);
    }
  }
}

new CalculatorApp();
