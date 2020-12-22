import { TabStorageService } from "./tab-storage-service";
import type { Storage } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { DEFAULT_TAB } from "./mocks";

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

  describe(".add(tab)", () => {
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

  describe(".remove(tabId)", () => {
    test("remove the tab from tabs list", async (done) => {
      const tab = { ...DEFAULT_TAB };
      localStorage.get.mockResolvedValue({ tabs: [tab] });
      await service.remove(tab.id);
      expect(localStorage.set.mock.calls[0][0]?.tabs?.length).toBe(0);
      done();
    });

    test("add the tab to history", async (done) => {
      const tab = { ...DEFAULT_TAB, title: "foo", url: "https://foo.com" };
      localStorage.get.mockResolvedValue({ tabs: [tab] });
      await service.remove(tab.id);
      expect(localStorage.set.mock.calls[0][0]?.history?.[0]).toEqual({
        title: "foo",
        url: "https://foo.com",
        favIconUrl: undefined,
      });
      done();
    });

    test("does'nt remove anything if the matching tabId isn't exist", async (done) => {
      const tab = { ...DEFAULT_TAB };
      localStorage.get.mockResolvedValue({ tabs: [tab] });
      await service.remove(undefined);
      await service.remove(9999);
      expect(localStorage.set).toBeCalledTimes(0);
      done();
    });

    test("use pendingUrl in history if url is falsy", async (done) => {
      const tab = {
        ...DEFAULT_TAB,
        title: "Bookmarks",
        pendingUrl: "chrome://bookmarks",
      };
      localStorage.get.mockResolvedValue({ tabs: [tab] });
      await service.remove(tab.id);
      expect(localStorage.set.mock.calls[0][0]?.history?.[0]).toEqual({
        title: "Bookmarks",
        url: "chrome://bookmarks",
        favIconUrl: undefined,
      });
      done();
    });
  });

  describe(".update(tab)", () => {
    test("update the tab that matches the tab's id ", async (done) => {
      const tab1 = { ...DEFAULT_TAB, id: 1 };
      const oldTab2 = {
        ...DEFAULT_TAB,
        id: 2,
        title: "New Tab",
        pendingUrl: "chrome::/newtab",
      };
      const newTab2 = {
        ...DEFAULT_TAB,
        id: 2,
        title: "Google",
        pendingUrl: "https://google.com",
      };
      localStorage.get.mockResolvedValue({ tabs: [tab1, oldTab2] });
      await service.update(newTab2);
      expect(localStorage.set.mock.calls[0][0]?.tabs).toEqual([tab1, newTab2]);
      done();
    });

    test("doesn't update if the provided tab's id is undefined", async (done) => {
      const tab1 = { ...DEFAULT_TAB, id: undefined };
      const tab2 = { ...DEFAULT_TAB, id: undefined, title: "abnormal case" };
      localStorage.get.mockResolvedValue({ tabs: [tab1] });
      await service.update(tab2);
      expect(localStorage.set).toBeCalledTimes(0);
      done();
    });
  });

  describe(".getLastTab()", () => {
    test("get lastTabId from local storage", async (done) => {
      localStorage.get.mockResolvedValue({ lastTab: { id: 1, windowId: 1 } });
      const lastTab = await service.getLastTab();
      expect(lastTab).toEqual({ id: 1, windowId: 1 });
      done();
    });
  });

  describe(".updateLastTab(tab)", () => {
    test("update lastTabId with the given tabId", () => {
      const tab = { tabId: 1, windowId: 1 };
      service.upateLastTab(tab);
      expect(localStorage.set).toBeCalledWith({
        lastTab: { id: 1, windowId: 1 },
      });
    });
  });

  describe.each`
    lastTabStack                       | windowId     | expectedTabId
    ${{ 999: [{ id: 1 }] }}            | ${999}       | ${1}
    ${{ 999: [{ id: 1 }] }}            | ${undefined} | ${undefined}
    ${{ 999: [{ id: 1 }] }}            | ${777}       | ${undefined}
    ${{ 999: [] }}                     | ${999}       | ${undefined}
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${999}       | ${2}
  `(
    ".getLastTabId($windowId: WindowId)",
    ({ lastTabStack, windowId, expectedTabId }) => {
      test(`returns ${expectedTabId}: TabId  when the stack is ${JSON.stringify(
        lastTabStack
      )}`, async (done) => {
        localStorage.get.mockResolvedValue({ lastTabStack });
        const tabId = await service.getLastTabId(windowId);
        expect(tabId).toBe(expectedTabId);
        done();
      });
    }
  );

  describe(".pushLastTab(tab)", () => {
    test("push a tab to lastTabStack", async (done) => {
      localStorage.get.mockResolvedValue({});
      const tab1 = { tabId: 1, windowId: 999 };
      await service.pushLastTab(tab1);
      expect(localStorage.set).toBeCalledWith({
        lastTabStack: { 999: [{ id: 1 }] },
      });

      localStorage.get.mockResolvedValue({
        lastTabStack: { 999: [{ id: 1 }] },
      });
      const tab2 = { tabId: 2, windowId: 999 };
      await service.pushLastTab(tab2);
      expect(localStorage.set).toBeCalledWith({
        lastTabStack: { 999: [{ id: 2 }, { id: 1 }] },
      });

      localStorage.get.mockResolvedValue({
        lastTabStack: { 999: [{ id: 2 }, { id: 1 }] },
      });
      const tab3 = { tabId: 3, windowId: 777 };
      await service.pushLastTab(tab3);
      expect(localStorage.set).toBeCalledWith({
        lastTabStack: { 999: [{ id: 2 }, { id: 1 }], 777: [{ id: 3 }] },
      });
      done();
    });
  });
});
