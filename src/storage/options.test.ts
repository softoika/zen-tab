import { browser } from "webextension-polyfill-ts";
import type { Storage } from "webextension-polyfill-ts";
import type { Options } from "./types";
import { getOptions, initOptions } from "./options";

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

const DEFAULT_OPTIONS: Options = {
  minTabs: 3,
  baseLimit: 30000,
};

describe("storage/options", () => {
  afterEach(() => {
    storage.get.mockReset();
    storage.set.mockReset();
  });

  describe("initOptions()", () => {
    test("sets default options for production", async (done) => {
      jest.mock("../default-options.prod", () => ({
        defaultOptions: { dummyOptions: "prod" },
      }));
      await initOptions("production");
      expect(storage.set).toBeCalledWith({ dummyOptions: "prod" });
      done();
    });

    test("sets default options for development", async (done) => {
      jest.mock("../default-options.dev", () => ({
        defaultOptions: { dummyOptions: "dev" },
      }));
      await initOptions("development");
      expect(storage.set).toBeCalledWith({ dummyOptions: "dev" });
      done();
    });

    test("fallbacks to production mode", async (done) => {
      jest.mock("../default-options.prod", () => ({
        defaultOptions: { dummyOptions: "prod" },
      }));
      await initOptions("proudction"); // typo
      expect(storage.set).toBeCalledWith({ dummyOptions: "prod" });
      done();
    });

    test("does'nt set the default options if options exist in the storage", async (done) => {
      jest.mock("../default-options.dev", () => ({
        defaultOptions: { dummyOptions: "dev" },
      }));
      storage.get.mockResolvedValue(DEFAULT_OPTIONS);
      await initOptions("production");
      expect(storage.set).not.toBeCalled();
      done();
    });
  });

  test("getOptions() gets all options", async (done) => {
    storage.get.mockResolvedValue(DEFAULT_OPTIONS);
    const options = await getOptions();
    expect(storage.get).toBeCalledWith();
    expect(options).toEqual(DEFAULT_OPTIONS);
    done();
  });

  test("getOptions(key) gets the value of the given key", async (done) => {
    storage.get.mockResolvedValue(DEFAULT_OPTIONS);
    const minTabs = await getOptions("minTabs");
    expect(storage.get).toBeCalledWith("minTabs");
    expect(minTabs).toBe(DEFAULT_OPTIONS.minTabs);
    done();
  });
});
