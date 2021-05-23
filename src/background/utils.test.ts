import { isValidAsId } from "./utils";

describe("isValidAsId()", () => {
  test("the name is valid", () => {
    expect(isValidAsId("123")).toBe(true);
    expect(isValidAsId("+123")).toBe(true);
    expect(isValidAsId("0")).toBe(true);
  });

  test("the name is invalid if not number", () => {
    expect(isValidAsId("abc")).toBe(false);
    expect(isValidAsId("/123")).toBe(false);
  });

  test("the name is invalid if not integer", () => {
    expect(isValidAsId("0.123")).toBe(false);
  });

  test("the name is invalid if minus", () => {
    expect(isValidAsId("0.123")).toBe(false);
  });
});
