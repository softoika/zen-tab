import type { Storage } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { getStorage, getValue } from "./tabs";
import type { TabStorage } from "./types";

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

describe("storage/tabs", () => {
  beforeEach(() => {
    localStorage.get.mockReset();
    localStorage.set.mockReset();
  });

  describe("getStorage()", () => {
    test("gets a whole object that has all values", async () => {
      const storage: TabStorage = {
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
      const storage: TabStorage = {
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
      const storage: TabStorage = {
        activatedTabs: { 999: [{ id: 2 }, { id: 1 }] },
        outdatedTabs: { 999: [{ id: 1 }] },
      };
      localStorage.get.mockResolvedValue(storage);

      const value = await getValue("outdatedTabs");

      expect(localStorage.get).toBeCalledWith("outdatedTabs");
      expect(value).toEqual({ 999: [{ id: 1 }] });
    });
  });
});
