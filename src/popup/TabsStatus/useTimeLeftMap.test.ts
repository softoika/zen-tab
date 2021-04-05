import { useTimeLeftMap } from "./useTimeLeftMap";
import { renderHook } from "@testing-library/react-hooks";
import { loadOptions } from "storage/options";
import { getValue } from "storage/tabs";

jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;
jest.mock("storage/tabs");
const getValueMock = getValue as jest.MockedFunction<typeof getValue>;

jest.useFakeTimers("modern");
const now = 1617535933951;
jest.setSystemTime(now);

describe("useTimeLeftMap()", () => {
  afterEach(() => {
    loadOptionsMock.mockReset();
    getValueMock.mockReset();
  });

  test("returns time left in each tab", async (done) => {
    loadOptionsMock.mockResolvedValue(60 * 60_000);
    getValueMock.mockResolvedValue({
      1: { lastInactivated: now - 30 * 60_000 },
      2: { lastInactivated: now - 90 * 60_000 },
      3: { lastInactivated: now - 60 * 60_000 },
      4: { lastInactivated: now - 60 * 60_000 - 1 },
    });

    const { result, waitForNextUpdate } = renderHook(() => useTimeLeftMap());
    await waitForNextUpdate();

    expect(loadOptionsMock).toBeCalledWith("baseLimit");
    expect(getValueMock).toBeCalledWith("tabsMap");
    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_800_000, minus: false, hours: 0, mins: 30 },
      2: { timeLeftMillis: -1_800_000, minus: true, hours: 0, mins: 30 },
      3: { timeLeftMillis: 0, minus: false, hours: 0, mins: 0 },
      4: { timeLeftMillis: -1, minus: true, hours: 0, mins: 0 },
    });
    done();
  });

  test("updates timeLeftMap every second", async (done) => {
    loadOptionsMock.mockResolvedValue(60 * 60_000);
    getValueMock.mockResolvedValue({
      1: { lastInactivated: now - 30 * 60_000 },
    });

    const { result, waitForNextUpdate } = renderHook(() => useTimeLeftMap());
    jest.advanceTimersByTime(1000);
    await waitForNextUpdate();

    expect(result.current).toEqual({
      1: { timeLeftMillis: 1_799_000, minus: false, hours: 0, mins: 29 },
    });
    done();
  });
});
