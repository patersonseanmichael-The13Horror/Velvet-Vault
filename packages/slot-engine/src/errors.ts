export class SlotEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotEngineError";
  }
}

export class ConfigError extends SlotEngineError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class SpinError extends SlotEngineError {
  constructor(message: string) {
    super(message);
    this.name = "SpinError";
  }
}
