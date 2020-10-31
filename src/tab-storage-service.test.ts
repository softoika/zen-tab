import { TabStorageService } from "./tab-storage-service";
import { browser, Storage } from "webextension-polyfill-ts";

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
const localStorage = browser.storage.local as jest.Mocked<
  Storage.LocalStorageArea
>;

const DEFAULT_TAB: chrome.tabs.Tab = {
  id: 1,
  windowId: 1,
  active: true,
  autoDiscardable: true,
  selected: true,
  discarded: false,
  pinned: false,
  index: 0,
  incognito: false,
  highlighted: true,
};

describe("TabStorageService", () => {
  let service: TabStorageService;

  beforeEach(() => {
    service = new TabStorageService(localStorage);
  });

  test("add a tab to empty tabs list", async (done) => {
    localStorage.get.mockResolvedValue({});
    const tab = { ...DEFAULT_TAB };
    await service.add(tab);
    expect(localStorage.set).toBeCalledWith({ tabs: [tab] });
    done();
  });

  test("add a second tab to tabs list", async (done) => {
    const tab1 = { ...DEFAULT_TAB };
    const tab2 = { ...DEFAULT_TAB, id: 2 };
    localStorage.get.mockResolvedValue({ tabs: [tab1] });
    await service.add(tab2);
    expect(localStorage.set).toBeCalledWith({ tabs: [tab1, tab2] });
    done();
  });
});
