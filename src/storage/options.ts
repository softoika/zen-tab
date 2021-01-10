import { browser } from "webextension-polyfill-ts";
import type { Options } from "./types";

const storage = browser.storage.sync;

export async function initOptions(nodeEnv = "production") {
  const options = await getOptions();
  if (options && Object.keys(options).length > 0) {
    return;
  }
  const { defaultOptions } =
    nodeEnv === "development"
      ? await import("./../default-options.dev")
      : await import("./../default-options.prod");
  return setOptions(defaultOptions);
}

export async function getOptions(): Promise<Options>;
export async function getOptions<K extends keyof Options>(
  key: K
): Promise<Options[K]>;
export async function getOptions<K extends keyof Options>(key?: K) {
  if (!key) {
    return storage.get();
  }
  const options = await storage.get(key);
  return options[key];
}

export function setOptions(options: Options) {
  storage.set(options);
}
