import { evacuateAlarms, recoverAlarms } from "background/core/evacuation";
import { handleIdleOnStateChanged } from "./onStateChanged";

jest.mock("background/core/evacuation");
const evacuateAlarmsMock = evacuateAlarms as jest.MockedFunction<
  typeof evacuateAlarms
>;
const recoverAlarmsMock = recoverAlarms as jest.MockedFunction<
  typeof recoverAlarms
>;

describe("idle.onStateChanged", () => {
  afterEach(() => {
    evacuateAlarmsMock.mockReset();
    recoverAlarmsMock.mockReset();
  });

  test("calls evacuateAlarms when locked", async () => {
    await handleIdleOnStateChanged("locked");
    expect(evacuateAlarmsMock).toBeCalled();
    expect(recoverAlarmsMock).not.toBeCalled();
  });

  test("calls recoverAlarms when active", async () => {
    await handleIdleOnStateChanged("active");
    expect(evacuateAlarmsMock).not.toBeCalled();
    expect(recoverAlarmsMock).toBeCalled();
  });

  test("does nothing when idle", async () => {
    await handleIdleOnStateChanged("idle");
    expect(evacuateAlarmsMock).not.toBeCalled();
    expect(recoverAlarmsMock).not.toBeCalled();
  });
});
