import { ClosedTabsHistory } from "./closed-tabs-history";
import { DEFAULT_TAB } from "../mocks";

describe("ClosedTabsHistory", () => {
  describe(".createTab(tab)", () => {
    test("adds a tab to empty tabs list", () => {
      const target = new ClosedTabsHistory({}, {});
      const tab = { ...DEFAULT_TAB, id: 1, windowId: 999 };

      target.createTab(tab);

      expect(target.tabs).toEqual({ 999: [tab] });
    });

    test("add a second tab to tabs list", () => {
      const tab1 = { ...DEFAULT_TAB, id: 1, windowId: 999 };
      const tab2 = { ...DEFAULT_TAB, id: 2, windowId: 999 };
      const target = new ClosedTabsHistory({}, {}).createTab(tab1);

      target.createTab(tab2);

      expect(target.tabs).toEqual({ 999: [tab1, tab2] });
    });
  });

  describe(".updateTab(tab)", () => {
    test("updates the tab that matches the tab's id ", () => {
      const tab1 = { ...DEFAULT_TAB, id: 1, windowId: 999 };
      const oldTab2 = {
        ...DEFAULT_TAB,
        id: 2,
        windowId: 999,
        title: "New Tab",
        pendingUrl: "chrome::/newtab",
      };
      const newTab2 = {
        ...DEFAULT_TAB,
        id: 2,
        windowId: 999,
        title: "Google",
        pendingUrl: "https://google.com",
      };
      const target = new ClosedTabsHistory({}, {})
        .createTab(tab1)
        .createTab(oldTab2);

      target.updateTab(newTab2);

      expect(target.tabs).toEqual({ 999: [tab1, newTab2] });
    });

    test("doesn't update if the provided tab's id is undefined", () => {
      const tab1 = { ...DEFAULT_TAB, id: undefined, windowId: 999 };
      const tab2 = {
        ...DEFAULT_TAB,
        id: undefined,
        windowId: 999,
        title: "abnormal case",
      };
      const target = new ClosedTabsHistory({}, {}).createTab(tab1);

      target.updateTab(tab2);

      expect(target.tabs).toEqual({});
    });
  });

  describe("closeTab(tabId, windowId)", () => {
    test("removes the tab from tabs list and append to history", () => {
      const tab = {
        ...DEFAULT_TAB,
        id: 1,
        windowId: 999,
        title: "foo",
        url: "https://foo.com",
      };
      const target = new ClosedTabsHistory({}, {}).createTab(tab);

      target.closeTab(1, 999);

      expect(target.tabs).toEqual({ 999: [] });
      expect(target.history).toEqual({
        999: [{ title: "foo", url: "https://foo.com", favIconUrl: undefined }],
      });
    });

    test("does'nt remove anything if the matching tabId isn't exist", () => {
      const tab = { ...DEFAULT_TAB, id: 1, windowId: 999 };
      const target = new ClosedTabsHistory({}, {}).createTab(tab);

      target.closeTab(2, 999);
      target.closeTab(1, 9999);

      expect(target.tabs).toEqual({ 999: [tab] });
      expect(target.history).toEqual({});
    });

    test("uses pendingUrl in history if url is falsy", () => {
      const tab = {
        ...DEFAULT_TAB,
        id: 1,
        windowId: 999,
        title: "Bookmarks",
        pendingUrl: "chrome://bookmarks",
      };
      const target = new ClosedTabsHistory({}, {}).createTab(tab);

      target.closeTab(1, 999);

      expect(target.history).toEqual({
        999: [
          {
            title: "Bookmarks",
            url: "chrome://bookmarks",
            favIconUrl: undefined,
          },
        ],
      });
    });
  });
});
