import { browser } from "webextension-polyfill-ts";
import type { Options } from "./types";

const storage = browser.storage.sync;

export async function initOptions(nodeEnv = "production") {
  const options = await loadOptions();
  if (options && Object.keys(options).length > 0) {
    return;
  }
  const { defaultOptions } =
    nodeEnv === "development"
      ? await import("./data/default-options.dev")
      : await import("./data/default-options.prod");
  return saveOptions(defaultOptions);
}

export async function loadOptions(): Promise<Options>;
export async function loadOptions<K extends keyof Options>(
  key: K
): Promise<Options[K]>;
export async function loadOptions<K extends keyof Options>(key?: K) {
  if (!key) {
    return storage.get();
  }
  const options = await storage.get(key);
  return options[key];
}

export function saveOptions(options: Options) {
  storage.set(options);
}
