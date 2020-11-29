import { Options, OptionsService } from "./options-service";
import { browser, Storage } from "webextension-polyfill-ts";

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
