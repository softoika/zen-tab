import { browser, Storage } from "webextension-polyfill-ts";
import { OptionsService } from "./options-service";
import type { Options } from "./types";

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

const syncStorage = browser.storage
  .sync as jest.Mocked<Storage.SyncStorageAreaSync>;

const DEFAULT_OPTIONS: Options = {
  minTabs: 3,
  baseLimit: 30000,
};

describe("OptionsService", () => {
  let service: OptionsService;

  beforeEach(() => {
    service = new OptionsService(syncStorage);
  });

  afterEach(() => {
    syncStorage.get.mockReset();
    syncStorage.set.mockReset();
  });

  describe(".init()", () => {
    test("set default options for production", async (done) => {
      jest.mock("./default-options.prod", () => ({
        defaultOptions: { dummyOptions: "prod" },
      }));
      await service.init("production");
      expect(syncStorage.set).toBeCalledWith({ dummyOptions: "prod" });
      done();
    });

    test("set default options for development", async (done) => {
      jest.mock("./default-options.dev", () => ({
        defaultOptions: { dummyOptions: "dev" },
      }));
      await service.init("development");
      expect(syncStorage.set).toBeCalledWith({ dummyOptions: "dev" });
      done();
    });

    test("fallback to production mode", async (done) => {
      jest.mock("./default-options.prod", () => ({
        defaultOptions: { dummyOptions: "prod" },
      }));
      await service.init("proudction"); // typo
      expect(syncStorage.set).toBeCalledWith({ dummyOptions: "prod" });
      done();
    });
  });

  test(".get() get all options", async (done) => {
    syncStorage.get.mockResolvedValue(DEFAULT_OPTIONS);
    const options = await service.get();
    expect(syncStorage.get).toBeCalledWith();
    expect(options).toEqual(DEFAULT_OPTIONS);
    done();
  });

  test(".get(key) get the value of the given key", async (done) => {
    syncStorage.get.mockResolvedValue(DEFAULT_OPTIONS);
    const minTabs = await service.get("minTabs");
    expect(syncStorage.get).toBeCalledWith("minTabs");
    expect(minTabs).toBe(DEFAULT_OPTIONS.minTabs);
    done();
  });
});
