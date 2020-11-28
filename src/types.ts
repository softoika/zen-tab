/**
 * A utility type that makes specific propertis(U) of an object(T) optional.
 *
 * For example,
 * ```
 * type Foo = { a: string, b: number, c: boolean };
 * type Bar = OptinalProps<Foo, 'a' | 'b'>; // { a?: string | undefined, b?: number | undefined } & { c: boolean };
 * ```
 */
type OptinalProps<
  T,
  U extends keyof T,
  _V extends keyof T = Exclude<keyof T, U>
> = { [P in U]?: T[P] } & { [P in _V]: T[P] };

/**
 * The tab type of webextension-pollyfill-ts does not support `selected` property.
 * Export the tab type makes `selected` optional because it is deprecated since Chrome 38.
 * `windowId`, `discarded` and `autoDiscardable` is optional in Firefox API.
 */
export type Tab = OptinalProps<
  chrome.tabs.Tab,
  "selected" | "windowId" | "discarded" | "autoDiscardable"
>;
