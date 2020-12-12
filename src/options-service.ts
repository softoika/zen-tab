import type { Storage } from "webextension-polyfill-ts";
import type { Options } from "./types";

export class OptionsService {
  constructor(private storage: Storage.SyncStorageAreaSync) {}

  async init(nodeEnv = "production"): Promise<OptionsService> {
    const { defaultOptions } =
      nodeEnv === "development"
        ? await import("./default-options.dev")
        : await import("./default-options.prod");
    return this.set(defaultOptions);
  }

  set(options: Options): OptionsService {
    this.storage.set(options);
    return this;
  }

  get(): Promise<Options>;
  get<K extends keyof Options>(key: K): Promise<Options[K]>;
  async get<K extends keyof Options>(key?: K): Promise<Options | Options[K]> {
    if (!key) {
      return this.storage.get() as Promise<Options>;
    }
    const options = (await this.storage.get(key)) as Options;
    return options[key];
  }
}
