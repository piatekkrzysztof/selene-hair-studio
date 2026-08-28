import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_MAX_AGE_S, verifySessionToken } from "./session";

const SECRET = "sekret-testowy-o-dlugosci-co-najmniej-32-znakow";
const NOW = 1_772_000_000_000;

describe("token sesji", () => {
  it("przechodzi weryfikację tuż po utworzeniu", async () => {
    const token = await createSessionToken("marta", SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe("marta");
  });

  it("odrzuca token podpisany innym sekretem", async () => {
    const token = await createSessionToken("marta", SECRET, NOW);
    expect(await verifySessionToken(token, "zupelnie-inny-sekret-o-dlugosci-32-znakow", NOW)).toBeNull();
  });

  it("odrzuca token z podmienioną treścią", async () => {
    const token = await createSessionToken("marta", SECRET, NOW);
    const [, signature] = token.split(".");
    const forged = `${btoa('{"sub":"admin","exp":9999999999}')
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")}.${signature}`;

    expect(await verifySessionToken(forged, SECRET, NOW)).toBeNull();
  });

  it("odrzuca token po upływie ważności", async () => {
    const token = await createSessionToken("marta", SECRET, NOW);
    const past = NOW + (SESSION_MAX_AGE_S + 1) * 1000;
    expect(await verifySessionToken(token, SECRET, past)).toBeNull();
  });

  it("akceptuje token tuż przed wygaśnięciem", async () => {
    const token = await createSessionToken("marta", SECRET, NOW);
    const almost = NOW + (SESSION_MAX_AGE_S - 1) * 1000;
    expect(await verifySessionToken(token, SECRET, almost)).toBe("marta");
  });

  it("nie rzuca na śmieciach zamiast tokenu", async () => {
    for (const value of [undefined, "", "bezkropki", "a.b", "...", "%%%.%%%"]) {
      expect(await verifySessionToken(value, SECRET, NOW)).toBeNull();
    }
  });
});
