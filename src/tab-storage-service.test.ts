import { TabStorageService } from "./tab-storage-service";
import type { Storage } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";

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

describe("TabStorageService", () => {
  let service: TabStorageService;

  beforeEach(() => {
    service = new TabStorageService(localStorage);
  });

  afterEach(() => {
    localStorage.get.mockReset();
    localStorage.set.mockReset();
  });

  test("TODO: write tests when refactoring", () => {
    expect(service).toBeTruthy();
  });
});
