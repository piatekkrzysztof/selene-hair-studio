import { describe, expect, it } from "vitest";
import {
  generateSlots,
  isSlotBookable,
  minutesToTime,
  pickStylist,
  timeToMinutes,
  weekdayOf,
  type SlotQuery,
} from "./availability";

// 2026-03-03 to wtorek, 2026-03-07 sobota, 2026-03-08 niedziela.
const TUESDAY = "2026-03-03";
const SATURDAY = "2026-03-07";
const SUNDAY = "2026-03-08";
const MONDAY = "2026-03-09";

function query(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    date: TUESDAY,
    durationMin: 60,
    stylistId: null,
    eligibleStylists: ["marta"],
    bookings: [],
    nowMin: null,
    ...overrides,
  };
}

describe("pomocnicze konwersje czasu", () => {
  it("zamienia minuty na HH:MM z wiodącym zerem", () => {
    expect(minutesToTime(9 * 60)).toBe("09:00");
    expect(minutesToTime(13 * 60 + 30)).toBe("13:30");
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("jest odwracalne", () => {
    expect(timeToMinutes(minutesToTime(755))).toBe(755);
  });

  it("wyznacza dzień tygodnia niezależnie od strefy czasowej", () => {
    expect(weekdayOf(TUESDAY)).toBe(2);
    expect(weekdayOf(SATURDAY)).toBe(6);
    expect(weekdayOf(SUNDAY)).toBe(0);
  });
});

describe("dni zamknięte", () => {
  it("nie proponuje terminów w niedzielę", () => {
    expect(generateSlots(query({ date: SUNDAY }))).toEqual([]);
  });

  it("nie proponuje terminów w poniedziałek", () => {
    expect(generateSlots(query({ date: MONDAY }))).toEqual([]);
  });
});

describe("granice godzin otwarcia", () => {
  it("pierwszy termin zaczyna się o otwarciu", () => {
    const slots = generateSlots(query());
    expect(slots[0]?.time).toBe("10:00");
  });

  it("sobota otwiera się wcześniej i zamyka wcześniej", () => {
    const slots = generateSlots(query({ date: SATURDAY }));
    expect(slots[0]?.time).toBe("09:00");
    // 16:00 zamknięcie, usługa 60 min + 15 min buforu = ostatni start 14:45,
    // ale przy siatce 30-minutowej ostatnie pełne okno to 14:30.
    expect(slots.at(-1)?.time).toBe("14:30");
  });

  it("usługa musi zmieścić się w całości przed zamknięciem, razem z buforem", () => {
    // 210 min + 15 min buforu = 225 min. Wtorek 10:00-20:00 = 600 min.
    // Ostatni możliwy start: 20:00 - 225 min = 16:15 -> w siatce 30 min to 16:00.
    const slots = generateSlots(query({ durationMin: 210 }));
    expect(slots.at(-1)?.time).toBe("16:00");
    expect(slots.at(-1)!.endMin).toBeLessThanOrEqual(20 * 60);
  });

  it("nie zwraca nic, gdy usługa jest dłuższa niż cały dzień pracy", () => {
    expect(generateSlots(query({ durationMin: 700 }))).toEqual([]);
  });

  it("odrzuca niepoprawny czas trwania", () => {
    expect(generateSlots(query({ durationMin: 0 }))).toEqual([]);
    expect(generateSlots(query({ durationMin: -30 }))).toEqual([]);
  });
});

describe("kolizje z istniejącymi rezerwacjami", () => {
  it("blokuje termin nachodzący na zajęty", () => {
    const slots = generateSlots(
      query({
        stylistId: "marta",
        bookings: [{ stylistId: "marta", startMin: 11 * 60, endMin: 12 * 60 + 15 }],
      }),
    );
    const at1030 = slots.find((s) => s.time === "10:30");
    const at1130 = slots.find((s) => s.time === "11:30");
    // 10:30 + 60 + 15 = 11:45 -> nachodzi na 11:00-12:15
    expect(at1030?.available).toBe(false);
    expect(at1130?.available).toBe(false);
  });

  it("nie traktuje styku jako kolizji", () => {
    const slots = generateSlots(
      query({
        stylistId: "marta",
        // Rezerwacja kończy się 11:15 (bufor już wliczony), następna może startować 11:30.
        bookings: [{ stylistId: "marta", startMin: 10 * 60, endMin: 11 * 60 + 15 }],
      }),
    );
    expect(slots.find((s) => s.time === "11:30")?.available).toBe(true);
  });

  it("rezerwacja u innej osoby nie blokuje terminu", () => {
    const slots = generateSlots(
      query({
        stylistId: "marta",
        eligibleStylists: ["marta", "iga"],
        bookings: [{ stylistId: "iga", startMin: 10 * 60, endMin: 12 * 60 }],
      }),
    );
    expect(slots.find((s) => s.time === "10:00")?.available).toBe(true);
  });

  it("rezerwacja bez przypisanej osoby blokuje wszystkich kandydatów", () => {
    // Zgłoszenie "dowolna osoba" zajmuje realny fotel, więc dopóki nie zostanie
    // przypisane, musi blokować - inaczej sprzedalibyśmy ten sam termin dwa razy.
    const slots = generateSlots(
      query({
        stylistId: "marta",
        bookings: [{ stylistId: null, startMin: 10 * 60, endMin: 11 * 60 }],
      }),
    );
    expect(slots.find((s) => s.time === "10:00")?.available).toBe(false);
  });
});

describe("wybór dowolnej osoby", () => {
  it("termin jest wolny, dopóki wolna jest choć jedna osoba", () => {
    const slots = generateSlots(
      query({
        stylistId: null,
        eligibleStylists: ["marta", "iga"],
        bookings: [{ stylistId: "marta", startMin: 10 * 60, endMin: 12 * 60 }],
      }),
    );
    const at1000 = slots.find((s) => s.time === "10:00");
    expect(at1000?.available).toBe(true);
    expect(at1000?.freeStylists).toEqual(["iga"]);
  });

  it("termin jest zajęty, gdy wszyscy kandydaci są zajęci", () => {
    const slots = generateSlots(
      query({
        stylistId: null,
        eligibleStylists: ["marta", "iga"],
        bookings: [
          { stylistId: "marta", startMin: 10 * 60, endMin: 12 * 60 },
          { stylistId: "iga", startMin: 10 * 60, endMin: 12 * 60 },
        ],
      }),
    );
    expect(slots.find((s) => s.time === "10:00")?.available).toBe(false);
  });

  it("przypisuje pierwszą wolną osobę", () => {
    const q = query({
      stylistId: null,
      eligibleStylists: ["marta", "iga"],
      bookings: [{ stylistId: "marta", startMin: 10 * 60, endMin: 12 * 60 }],
    });
    expect(pickStylist(q, 10 * 60)).toBe("iga");
  });

  it("nie przypisuje nikogo, gdy termin jest zajęty", () => {
    const q = query({
      stylistId: null,
      eligibleStylists: ["marta"],
      bookings: [{ stylistId: "marta", startMin: 10 * 60, endMin: 12 * 60 }],
    });
    expect(pickStylist(q, 10 * 60)).toBeNull();
  });

  it("nie proponuje osoby, która nie wykonuje tej usługi", () => {
    const slots = generateSlots(query({ stylistId: "nina", eligibleStylists: ["marta"] }));
    expect(slots).toEqual([]);
  });
});

describe("minimalne wyprzedzenie", () => {
  it("odrzuca terminy zbyt bliskie obecnej godzinie", () => {
    // Teraz 10:00, wyprzedzenie 120 min -> pierwszy możliwy start to 12:00.
    const slots = generateSlots(query({ nowMin: 10 * 60 }));
    expect(slots.find((s) => s.time === "11:00")?.available).toBe(false);
    expect(slots.find((s) => s.time === "12:00")?.available).toBe(true);
  });

  it("nie stosuje wyprzedzenia do dni przyszłych", () => {
    const slots = generateSlots(query({ nowMin: null }));
    expect(slots.find((s) => s.time === "10:00")?.available).toBe(true);
  });
});

describe("isSlotBookable", () => {
  it("potwierdza wolny termin", () => {
    expect(isSlotBookable(query(), 10 * 60)).toBe(true);
  });

  it("odrzuca termin spoza siatki", () => {
    expect(isSlotBookable(query(), 10 * 60 + 7)).toBe(false);
  });

  it("odrzuca termin w dniu zamkniętym", () => {
    expect(isSlotBookable(query({ date: SUNDAY }), 10 * 60)).toBe(false);
  });
});
