import { useTimeLeftMap } from "./useTimeLeftMap";
import { renderHook } from "@testing-library/react-hooks";
import { loadOptions } from "storage/options";
import { getValue } from "storage/tabs";
import type { Options, TabStorage } from "storage/types";

jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;
jest.mock("storage/tabs");
const getValueMock = getValue as jest.MockedFunction<typeof getValue>;

const now = 1617535933951;

describe("useTimeLeftMap()", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(now);
  });

  afterEach(() => {
    loadOptionsMock.mockReset();
    getValueMock.mockReset();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("returns time left in each tab", async () => {
    const { checkArgs } = mockResolvedValues({
      baseLimit: 60 * 60_000,
      tabsMap: {
        1: {
          lastInactivated: now - 30 * 60_000,
          scheduledTime: now + 30 * 60_000,
        },
        2: {
          lastInactivated: now - 90 * 60_000,
          scheduledTime: now - 30 * 60_000,
        },
        3: { lastInactivated: now - 60 * 60_000, scheduledTime: now },
        4: { lastInactivated: now - 60 * 60_000 - 1, scheduledTime: now - 1 },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useTimeLeftMap());
    expect(result.current).toBe(null);
    await waitForNextUpdate();

    checkArgs();
    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_800_000, minus: false, hours: 0, mins: 30 },
      2: { timeLeftMillis: -1_800_000, minus: true, hours: 0, mins: 30 },
      3: { timeLeftMillis: 0, minus: false, hours: 0, mins: 0 },
      4: { timeLeftMillis: -1, minus: true, hours: 0, mins: 0 },
    });
  });

  test("updates timeLeftMap every second", async () => {
    const { checkArgs } = mockResolvedValues({
      baseLimit: 60 * 60_000,
      tabsMap: {
        1: {
          lastInactivated: now - 30 * 60_000,
          scheduledTime: now + 30 * 60_000,
        },
      },
    });

    const { result, rerender, waitForNextUpdate } = renderHook(() =>
      useTimeLeftMap()
    );
    checkArgs();
    expect(result.current).toBe(null);

    // 1st update
    await waitForNextUpdate();
    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_800_000, minus: false, hours: 0, mins: 30 },
    });

    // rerendering immediately after update
    rerender();

    // not update until 1000ms
    jest.advanceTimersByTime(999);
    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_800_000, minus: false, hours: 0, mins: 30 },
    });

    jest.advanceTimersByTime(1);
    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_799_000, minus: false, hours: 0, mins: 29 },
    });

    rerender();

    jest.advanceTimersByTime(1000);
    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_798_000, minus: false, hours: 0, mins: 29 },
    });
  });
});

function mockResolvedValues(values: {
  baseLimit: Options["baseLimit"];
  tabsMap: TabStorage["tabsMap"];
}) {
  loadOptionsMock.mockResolvedValue(values.baseLimit);
  getValueMock.mockResolvedValue(values.tabsMap);

  return {
    checkArgs() {
      expect(loadOptionsMock).toBeCalledWith("baseLimit");
      expect(getValueMock).toBeCalledWith("tabsMap");
    },
  };
}
