/**
 * A utility type that makes specific propertis(U) of an object(T) optional.
 *
 * For example,
 * ```
 * type Foo = { a: string, b: number, c: boolean };
 * type Bar = OptinalProps<Foo, 'a' | 'b'>; // { a?: string | undefined, b?: number | undefined } & { c: boolean };
 * ```
 > = Flatten<{ [P in U]?: T[P] } & { [P in _V]: T[P] }>;
 */
type OptinalProps<
  T,
  U extends keyof T,
  _V extends keyof T = Exclude<keyof T, U>
> = {
  [Q in keyof ({ [P in U]?: T[P] } & { [P in _V]: T[P] })]: ({
    [P in U]?: T[P];
  } &
    { [P in _V]: T[P] })[Q];
};

/**
 * The tab type of webextension-pollyfill-ts does not support `selected` property.
 * Export the tab type makes `selected` optional because it is deprecated since Chrome 38.
 * `windowId`, `discarded` and `autoDiscardable` is optional in Firefox API.
 */
export type Tab = OptinalProps<
  chrome.tabs.Tab,
  "selected" | "windowId" | "discarded" | "autoDiscardable"
>;

export interface Options {
  /**
   * The mininum number that this extension can keep tabs.
   * The number of tabs can never be less than this number.
   * If there are more tabs than this, an oldest tab is closed until its number
   * is equal to minTabs.
   */
  minTabs: number;

  /**
   * Time limit for the tab to live if the number of tabs is more than minTabs.
   * The unit of this value is milliseconds.
   */
  baseLimit: number;
}
