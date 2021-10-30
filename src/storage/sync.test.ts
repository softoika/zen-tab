import { browser } from "webextension-polyfill-ts";
import type { Storage } from "webextension-polyfill-ts";
import type { SyncStorage } from "./types";
import { loadOptions, initOptions } from "./sync";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    storage: {
      sync: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
  },
}));

const storage = browser.storage
  .sync as jest.Mocked<Storage.SyncStorageAreaSync>;

const DEFAULT_OPTIONS: SyncStorage = {
  minTabs: 3,
  baseLimit: 30000,
  protectPinnedTabs: true,
};

describe("storage/sync", () => {
  afterEach(() => {
    storage.get.mockReset();
    storage.set.mockReset();
  });

  describe("initOptions()", () => {
    test("sets default options for production", async () => {
      jest.mock("./data/default-options.prod", () => ({
        defaultOptions: { dummyOptions: "prod" },
      }));
      await initOptions("production");
      expect(storage.set).toBeCalledWith({ dummyOptions: "prod" });
    });

    test("sets default options for development", async () => {
      jest.mock("./data/default-options.dev", () => ({
        defaultOptions: { dummyOptions: "dev" },
      }));
      await initOptions("development");
      expect(storage.set).toBeCalledWith({ dummyOptions: "dev" });
    });

    test("fallbacks to production mode", async () => {
      jest.mock("./data/default-options.prod", () => ({
        defaultOptions: { dummyOptions: "prod" },
      }));
      await initOptions("proudction"); // typo
      expect(storage.set).toBeCalledWith({ dummyOptions: "prod" });
    });

    test("does'nt set the default options if options exist in the storage", async () => {
      jest.mock("./data/default-options.dev", () => ({
        defaultOptions: { dummyOptions: "dev" },
      }));
      storage.get.mockResolvedValue(DEFAULT_OPTIONS);
      await initOptions("production");
      expect(storage.set).not.toBeCalled();
    });
  });

  test("getOptions() gets all options", async () => {
    storage.get.mockResolvedValue(DEFAULT_OPTIONS);
    const options = await loadOptions();
    expect(storage.get).toBeCalledWith();
    expect(options).toEqual(DEFAULT_OPTIONS);
  });

  test("getOptions(key) gets the value of the given key", async () => {
    storage.get.mockResolvedValue(DEFAULT_OPTIONS);
    const minTabs = await loadOptions("minTabs");
    expect(storage.get).toBeCalledWith("minTabs");
    expect(minTabs).toBe(DEFAULT_OPTIONS.minTabs);
  });
});
