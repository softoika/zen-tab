import { DEFAULT_TAB } from "./mocks";
import { OutdatedTabs } from "./outdated-tabs";

describe("OutdatedTabs", () => {
  describe.each`
    before                             | tabId | windowId | expected
    ${{}}                              | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{ 999: [] }}                     | ${1}  | ${999}   | ${{ 999: [{ id: 1 }] }}
    ${{ 999: [{ id: 1 }] }}            | ${2}  | ${999}   | ${{ 999: [{ id: 1 }, { id: 2 }] }}
    ${{ 999: [{ id: 1 }, { id: 2 }] }} | ${1}  | ${999}   | ${{ 999: [{ id: 2 }, { id: 1 }] }}
  `(
    ".push({ id: $tabId, windowId: $windowId })",
    ({ before, tabId, windowId, expected }) => {
      test(`outdatedTabs: ${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, () => {
        const target = new OutdatedTabs(before);
        const changed = target.push({ ...DEFAULT_TAB, id: tabId, windowId });
        expect(target.value).toEqual(expected);
        expect(changed.value).toEqual(expected);
      });
    }
  );

  describe.each`
    tabId        | windowId
    ${undefined} | ${999}
    ${1}         | ${undefined}
    ${undefined} | ${undefined}
  `(".push({ id: $tabId, windowId: $windowId })", ({ tabId, windowId }) => {
    test("does not change outdatedTabs", () => {
      const target = new OutdatedTabs({});
      const changed = target.push({ ...DEFAULT_TAB, id: tabId, windowId });
      expect(target.value).toEqual({});
      expect(changed.value).toEqual({});
    });
  });

  describe.each`
    outdatedTabs                       | windowId | expected
    ${{}}                              | ${999}   | ${undefined}
    ${{ 999: [{ id: 1 }] }}            | ${999}   | ${1}
    ${{ 999: [{ id: 1 }, { id: 2 }] }} | ${999}   | ${2}
  `(
    ".getLastTabId($windowId: WindowId)",
    ({ outdatedTabs, windowId, expected }) => {
      test(`returns ${expected} when the outdatedTabs is ${JSON.stringify(
        outdatedTabs
      )}`, () => {
        const target = new OutdatedTabs(outdatedTabs);
        expect(target.getLastTabId(windowId)).toBe(expected);
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
      test(`${JSON.stringify(before)} should be ${JSON.stringify(
        expected
      )}`, () => {
        const target = new OutdatedTabs(before);
        const changed = target.remove(tabId, windowId);
        expect(target.value).toEqual(expected);
        expect(changed.value).toEqual(expected);
      });
    }
  );
});
