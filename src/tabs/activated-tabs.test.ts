import { ActivatedTabs, createActivatedTabs } from "./activated-tabs";
import { DEFAULT_TAB } from "../mocks";
import type { Tab } from "../types";

describe("ActivatedTabs", () => {
  describe.each`
    activatedTabs                      | windowId     | expectedTabId
    ${{ 999: [{ id: 1 }] }}            | ${999}       | ${1}
    ${{ 999: [{ id: 1 }] }}            | ${undefined} | ${undefined}
    ${{ 999: [{ id: 1 }] }}            | ${777}       | ${undefined}
    ${{ 999: [] }}                     | ${999}       | ${undefined}
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${999}       | ${2}
  `(
    ".getLastTabId($windowId: WindowId)",
    ({ activatedTabs, windowId, expectedTabId }) => {
      test(`returns tabId(${expectedTabId}) when the stack is ${JSON.stringify(
        activatedTabs
      )}`, () => {
        const target = new ActivatedTabs(activatedTabs);
        const id = target.getLastTabId(windowId);
        expect(id).toBe(expectedTabId);
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
    ".push($tabId: TabId, $windowId: WindowId) ",
    ({ before, tabId, windowId, expected }) => {
      test(`the stack ${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, () => {
        const target = new ActivatedTabs(before);
        target.push(tabId, windowId);
        expect(target.value).toEqual(expected);
      });
    }
  );

  describe.each`
    before                             | tabId | windowId | expected
    ${{ 999: [{ id: 2 }, { id: 1 }] }} | ${1}  | ${999}   | ${{ 999: [{ id: 2 }] }}
    ${{ 999: [{ id: 1 }] }}            | ${1}  | ${999}   | ${{ 999: [] }}
    ${{ 999: [] }}                     | ${1}  | ${999}   | ${{ 999: [] }}
    ${{}}                              | ${1}  | ${999}   | ${{ 999: [] }}
  `(
    ".remove($tabId: TabId, $windowId: WindowId)",
    ({ before, tabId, windowId, expected }) => {
      test(`the stack ${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, () => {
        const target = new ActivatedTabs(before);
        target.remove(tabId, windowId);
        expect(target.value).toEqual(expected);
      });
    }
  );
});

describe("createActivatedTabs(tabs)", () => {
  test("creates ActivatedTabs that have stacks in each window", () => {
    const tabs: Tab[] = [
      { ...DEFAULT_TAB, id: 1, windowId: 999, active: false },
      { ...DEFAULT_TAB, id: 2, windowId: 777 },
      { ...DEFAULT_TAB, id: 3, windowId: 999, active: true },
      { ...DEFAULT_TAB, id: 4, windowId: undefined },
      { ...DEFAULT_TAB, id: undefined, windowId: 777 },
    ];
    const activatedTabs = createActivatedTabs(tabs);
    expect(activatedTabs.value).toEqual({
      999: [{ id: 3 }, { id: 1 }],
      777: [{ id: 2 }],
    });
  });

  test("the stack is sorted by last active", () => {
    const tabs: Tab[] = [
      { ...DEFAULT_TAB, id: 1, windowId: 999, active: false },
      { ...DEFAULT_TAB, id: 2, windowId: 999, active: true },
      { ...DEFAULT_TAB, id: 3, windowId: 999, active: false },
    ];
    const activatedTabs = createActivatedTabs(tabs);
    expect(activatedTabs.value).toEqual({
      999: [{ id: 2 }, { id: 3 }, { id: 1 }],
    });
  });
});
