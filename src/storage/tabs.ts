import { browser } from "webextension-polyfill-ts";
import { ActivatedTabs } from "../activated-tabs";
import { ClosedTabsHistory } from "../closed-tabs-history";
import { OutdatedTabs } from "../outdated-tabs";
import type { TabStorage } from "./types";

const localStorage = browser.storage.local;

export function getStorage(): Promise<TabStorage>;
export function getStorage<K extends keyof TabStorage>(
  keys: K[]
): Promise<Pick<TabStorage, K>>;
export function getStorage<K extends keyof TabStorage>(
  keys?: K[]
): Promise<Pick<TabStorage, K> | TabStorage> {
  if (!keys) {
    return localStorage.get();
  }
  return localStorage.get(keys);
}

export function updateStorage(value: TabStorage) {
  localStorage.set(value);
}

export async function getValue<K extends keyof TabStorage>(
  key: K
): Promise<TabStorage[K] | undefined> {
  const storage = await localStorage.get(key);
  return storage[key];
}

export async function getClosedTabHistory(): Promise<ClosedTabsHistory> {
  const { tabs, history } = await getStorage(["tabs", "history"]);
  return new ClosedTabsHistory(tabs ?? {}, history ?? {});
}

export function updateClosedTabHistory(closedTabHistory: ClosedTabsHistory) {
  updateStorage({
    tabs: closedTabHistory.tabs,
    history: closedTabHistory.history,
  });
}

export async function getActivatedTabs(): Promise<ActivatedTabs> {
  const activatedTabs = (await getValue("activatedTabs")) ?? {};
  return new ActivatedTabs(activatedTabs);
}

export function updateActivatedTabs(activatedTabs: ActivatedTabs) {
  updateStorage({ activatedTabs: activatedTabs.value });
}

export async function getOutdatedTabs(): Promise<OutdatedTabs> {
  const outdatedTabs = (await getValue("outdatedTabs")) ?? {};
  return new OutdatedTabs(outdatedTabs);
}

export function updateOutdatedTabs(outdatedTabs: OutdatedTabs) {
  updateStorage({ outdatedTabs: outdatedTabs.value });
}
