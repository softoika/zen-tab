import type { Storage } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { getStorage, getValue, updateStorage } from "./local";
import type { LocalStorage } from "./types";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
  },
}));
const localStorage = browser.storage
  .local as jest.Mocked<Storage.LocalStorageArea>;

describe("storage/local", () => {
  beforeEach(() => {
    localStorage.get.mockReset();
    localStorage.set.mockReset();
  });

  describe("getStorage()", () => {
    test("gets a whole object that has all values", async () => {
      const storage: LocalStorage = {
        activatedTabs: { 999: [{ id: 2 }, { id: 1 }] },
        outdatedTabs: { 999: [{ id: 1 }] },
      };
      localStorage.get.mockResolvedValue(storage);

      const target = await getStorage();

      expect(target).toEqual(storage);
    });
  });

  describe("getStorage(keys)", () => {
    test("gets an object that has values of specified keys", async () => {
      const storage: LocalStorage = {
        activatedTabs: { 999: [{ id: 2 }, { id: 1 }] },
        outdatedTabs: { 999: [{ id: 1 }] },
      };
      localStorage.get.mockResolvedValue(storage);

      const target = await getStorage(["outdatedTabs", "activatedTabs"]);

      expect(localStorage.get).toBeCalledWith([
        "outdatedTabs",
        "activatedTabs",
      ]);
      expect(target).toEqual(storage);
    });
  });

  describe("getValue(key)", () => {
    test("returns a value of the specified key", async () => {
      const storage: LocalStorage = {
        activatedTabs: { 999: [{ id: 2 }, { id: 1 }] },
        outdatedTabs: { 999: [{ id: 1 }] },
      };
      localStorage.get.mockResolvedValue(storage);

      const value = await getValue("outdatedTabs");

      expect(localStorage.get).toBeCalledWith(["outdatedTabs"]);
      expect(value).toEqual({ 999: [{ id: 1 }] });
    });
  });

  describe("cache", () => {
    test("doesn't re-instantiate the cache instance by multiple imports", async () => {
      const { cache: c1 } = await import("./local");
      c1.put({ activatedTabs: { 1: [] } });
      const { cache: c2 } = await import("./local");
      expect(c2.get(["activatedTabs"])).toEqual({
        data: { activatedTabs: { 1: [] } },
        missHitKeys: [],
      });
    });

    test("updates the cache when updating the storage", async () => {
      updateStorage({ activatedTabs: { 999: [{ id: 1 }] } });
      localStorage.get.mockResolvedValue({
        activatedTabs: { 999: [{ id: 1 }] },
      });

      const result = await getStorage(["activatedTabs"]);

      expect(result).toEqual({ activatedTabs: { 999: [{ id: 1 }] } });
      expect(localStorage.get).not.toBeCalled();
    });
  });
});
