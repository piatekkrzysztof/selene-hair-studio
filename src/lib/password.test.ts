import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hasło", () => {
  it("ten sam hash dla tej samej soli", async () => {
    const stored = await hashPassword("tajne-haslo");
    const salt = stored.split(":")[0]!;
    expect(await hashPassword("tajne-haslo", salt)).toBe(stored);
  });

  it("różna sól daje różny hash tego samego hasła", async () => {
    const a = await hashPassword("tajne-haslo");
    const b = await hashPassword("tajne-haslo");
    expect(a).not.toBe(b);
  });

  it("przyjmuje poprawne hasło", async () => {
    const stored = await hashPassword("tajne-haslo");
    expect(await verifyPassword("tajne-haslo", stored)).toBe(true);
  });

  it("odrzuca błędne hasło", async () => {
    const stored = await hashPassword("tajne-haslo");
    expect(await verifyPassword("tajne-hasło", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("odrzuca uszkodzony wpis w zmiennej środowiskowej zamiast rzucać", async () => {
    expect(await verifyPassword("cokolwiek", "bez-dwukropka")).toBe(false);
    expect(await verifyPassword("cokolwiek", "")).toBe(false);
  });
});
