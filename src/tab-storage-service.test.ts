import { TabStorageService } from "./tab-storage-service";
import type { Storage } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { DEFAULT_TAB } from "./mocks";
import type { Tab } from "./types";

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

  describe.each`
    before                             | tabId | windowId | expected
    ${{}}                              | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{ 999: [] }}                     | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{ 999: [{ id: 1 }] }}            | ${2}  | ${999}   | ${{ 999: [{ id: 2 }, { id: 1 }] }}
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${3}  | ${777}   | ${{ 999: [{ id: 2 }, { id: 1 }], 777: [{ id: 3 }] }}
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${1}  | ${999}   | ${{ 999: [{ id: 1 }, { id: 2 }] }}
  `(
    ".pushLastTab({ tabId: $tabId, windowId: $windowId }) ",
    ({ before, tabId, windowId, expected }) => {
      test(`the stack ${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, async (done) => {
        localStorage.get.mockResolvedValue({ lastTabStack: before });
        await service.pushLastTab({ tabId, windowId });
        expect(localStorage.set).toBeCalledWith({ lastTabStack: expected });
        done();
      });
    }
  );

  describe.each`
    before                             | tabId | windowId | expected
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${1}  | ${999}   | ${{ 999: [{ id: 2 }] }}
    ${{ 999: [{ id: 1 }] }}            | ${1}  | ${999}   | ${{ 999: [] }}
    ${{ 999: [] }}                     | ${1}  | ${999}   | ${{ 999: [] }}
    ${{}}                              | ${1}  | ${999}   | ${{ 999: [] }}
    ${undefined}                       | ${1}  | ${999}   | ${{ 999: [] }}
  `(
    ".removeTabFromStack($tabId: TabId, $windowId: WindowId)",
    ({ before, tabId, windowId, expected }) => {
      test(`the stack ${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, async (done) => {
        localStorage.get.mockResolvedValue({ lastTabStack: before });
        await service.removeTabFromStack(tabId, windowId);
        expect(localStorage.set).toBeCalledWith({ lastTabStack: expected });
        done();
      });
    }
  );

  describe(".createLastTabStack(tabs)", () => {
    test("create the stack in each window", () => {
      const tabs: Tab[] = [
        { ...DEFAULT_TAB, id: 1, windowId: 999, active: false },
        { ...DEFAULT_TAB, id: 2, windowId: 777 },
        { ...DEFAULT_TAB, id: 3, windowId: 999, active: true },
        { ...DEFAULT_TAB, id: 4, windowId: undefined },
        { ...DEFAULT_TAB, id: undefined, windowId: 777 },
      ];
      service.createLastTabStack(tabs);
      expect(localStorage.set).toBeCalledWith({
        lastTabStack: { 999: [{ id: 3 }, { id: 1 }], 777: [{ id: 2 }] },
      });
    });

    test("the stack is sorted by its activity", () => {
      const tabs: Tab[] = [
        { ...DEFAULT_TAB, id: 1, windowId: 999, active: false },
        { ...DEFAULT_TAB, id: 2, windowId: 999, active: true },
        { ...DEFAULT_TAB, id: 3, windowId: 999, active: false },
      ];
      service.createLastTabStack(tabs);
      // an inactive tab is pushed to the last, and an active tab is pushed to the first.
      expect(localStorage.set).toBeCalledWith({
        lastTabStack: { 999: [{ id: 2 }, { id: 1 }, { id: 3 }] },
      });
    });
  });

  describe.each`
    before                             | tabId | windowId | expected
    ${undefined}                       | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{}}                              | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{ 999: [] }}                     | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{ 999: [{ id: 1 }] }}            | ${2}  | ${999}   | ${{ 999: [{ id: 1 }, { id: 2 }] }}
    ${{ 999: [{ id: 1 }, { id: 2 }] }} | ${1}  | ${999}   | ${{ 999: [{ id: 2 }, { id: 1 }] }}
  `(
    ".pushOutdatedTab({ id: $tabId, windowId: $windowId })",
    ({ before, tabId, windowId, expected }) => {
      test(`outdatedTabs: ${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, async (done) => {
        localStorage.get.mockResolvedValue({ outdatedTabs: before });
        await service.pushOutdatedTab({ ...DEFAULT_TAB, id: tabId, windowId });
        expect(localStorage.set).toBeCalledWith({ outdatedTabs: expected });
        done();
      });
    }
  );

  describe.each`
    tabId        | windowId
    ${undefined} | ${999}
    ${1}         | ${undefined}
    ${undefined} | ${undefined}
  `(
    ".pushOutdatedTab({ id: $tabId, windowId: $windowId })",
    ({ tabId, windowId }) => {
      test("does not change outdatedTabs", async (done) => {
        localStorage.get.mockResolvedValue({ outdatedTabs: {} });
        await service.pushOutdatedTab({ ...DEFAULT_TAB, id: tabId, windowId });
        expect(localStorage.set).not.toBeCalled();
        done();
      });
    }
  );

  describe.each`
    outdatedTabs            | windowId | expected
    ${undefined}            | ${999}   | ${[]}
    ${{}}                   | ${999}   | ${[]}
    ${{ 999: [{ id: 1 }] }} | ${999}   | ${[{ id: 1 }]}
  `(
    ".getOutdatedTabs($windowId: WindowId)",
    ({ outdatedTabs, windowId, expected }) => {
      test(`returns ${JSON.stringify(
        expected
      )} when the outdatedTabs is ${JSON.stringify(
        outdatedTabs
      )}`, async (done) => {
        localStorage.get.mockResolvedValue({ outdatedTabs });
        const tabs = await service.getOutdatedTabs(windowId);
        expect(tabs).toEqual(expected);
        done();
      });
    }
  );

  describe.each`
    before                             | tabId | windowId | expected
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${1}  | ${999}   | ${{ 999: [{ id: 2 }] }}
    ${{ 999: [{ id: 1 }] }}            | ${1}  | ${999}   | ${{ 999: [] }}
    ${{ 999: [] }}                     | ${1}  | ${999}   | ${{ 999: [] }}
    ${{}}                              | ${1}  | ${999}   | ${{ 999: [] }}
    ${undefined}                       | ${1}  | ${999}   | ${{ 999: [] }}
  `(
    ".removeFromOutdatedTabs($tabId: TabId, $windowId: WindowId)",
    ({ before, tabId, windowId, expected }) => {
      test(`${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, async (done) => {
        localStorage.get.mockResolvedValue({ outdatedTabs: before });
        await service.removeFromOutdatedTabs(tabId, windowId);
        expect(localStorage.set).toBeCalledWith({ outdatedTabs: expected });
        done();
      });
    }
  );
});
