"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BOOKABLE_SERVICES, SALON, STYLISTS, type ServiceId, type StylistId } from "@/lib/salon";
import { formatDate, formatDateShort, upcomingOpenDays } from "@/lib/dates";
import { minutesToTime } from "@/lib/availability";

interface ApiSlot {
  time: string;
  startMin: number;
  available: boolean;
}

interface FieldError {
  id: string;
  message: string;
  /** Element, na który przenosimy fokus po kliknięciu w podsumowanie błędów. */
  target: string;
}

export function BookingForm() {
  const t = useTranslations("booking");
  const ts = useTranslations("services");
  const tt = useTranslations("team");
  const locale = useLocale();

  const [days, setDays] = useState<string[]>([]);
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [stylistId, setStylistId] = useState<StylistId | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);

  const [slots, setSlots] = useState<ApiSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // pułapka na boty

  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const errorBox = useRef<HTMLDivElement>(null);
  const successBox = useRef<HTMLDivElement>(null);

  const service = useMemo(
    () => BOOKABLE_SERVICES.find((s) => s.id === serviceId) ?? null,
    [serviceId],
  );

  // Dni liczymy po zamontowaniu komponentu. Gdyby liczyła je strona,
  // statycznie wygenerowany HTML zamroziłby "dzisiaj" na moment builda.
  useEffect(() => {
    setDays(upcomingOpenDays(12));
  }, []);

  // Zmiana usługi może unieważnić wybraną osobę - nie każda robi wszystko.
  useEffect(() => {
    if (service && stylistId && !service.stylists.includes(stylistId)) {
      setStylistId(null);
    }
  }, [service, stylistId]);

  // Wolne godziny bierzemy z serwera, bo tylko on zna aktualny stan bazy.
  useEffect(() => {
    if (!serviceId || !date) {
      setSlots(null);
      return;
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    setStartMin(null);

    const params = new URLSearchParams({ serviceId, date });
    if (stylistId) params.set("stylistId", stylistId);

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("availability_failed"))))
      .then((data: { slots: ApiSlot[] }) => setSlots(data.slots))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));

    return () => controller.abort();
  }, [serviceId, date, stylistId]);

  // Fokus po nieudanej wysyłce przenosimy w efekcie, a nie w
  // requestAnimationFrame. Odkąd walidacja jest asynchroniczna (schemat
  // dociąga się przy pierwszej wysyłce), rAF potrafił odpalić się przed
  // zatwierdzeniem DOM przez Reacta i ref był jeszcze pusty. Efekt
  // uruchamia się po commicie, więc element na pewno istnieje.
  useEffect(() => {
    if (errors.length > 0) errorBox.current?.focus();
  }, [errors]);

  useEffect(() => {
    if (bookingId) successBox.current?.focus();
  }, [bookingId]);

  // Schemat wczytujemy dopiero przy wysyłce, a nie przy wejściu na stronę.
  // To ten sam plik, co po stronie serwera - wspólne źródło reguł zostaje,
  // przesuwa się wyłącznie moment jego pobrania. Zod to 14 kB, których nikt
  // nie potrzebuje, dopóki nie kliknie "Wyślij".
  async function validate(): Promise<FieldError[]> {
    const { bookingInputSchema } = await import("@/lib/booking-schema");
    const found: FieldError[] = [];
    if (!serviceId) found.push({ id: "service", message: t("errorService"), target: "grupa-usluga" });
    if (!date || startMin === null)
      found.push({ id: "slot", message: t("errorSlot"), target: "grupa-termin" });

    const parsed = bookingInputSchema.safeParse({
      serviceId: serviceId ?? "",
      stylistId,
      date: date ?? "1970-01-01",
      startMin: startMin ?? 0,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      note,
      consent,
      locale,
      website,
    });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      if (fields.customerName) found.push({ id: "name", message: t("errorName"), target: "imie" });
      if (fields.customerPhone)
        found.push({ id: "phone", message: t("errorPhone"), target: "telefon" });
      if (fields.customerEmail)
        found.push({ id: "email", message: t("errorEmail"), target: "mail" });
      if (fields.consent) found.push({ id: "consent", message: t("errorConsent"), target: "zgoda" });
    }

    return found;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const found = await validate();
    setErrors(found);

    if (found.length > 0) {
      // Po nieudanym wysłaniu fokus idzie na podsumowanie błędów, a nie na
      // pierwsze pole - użytkownik czytnika ekranu najpierw słyszy, ile
      // rzeczy wymaga poprawki, a dopiero potem skacze do konkretnej.
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          stylistId,
          date,
          startMin,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          note: note.trim(),
          consent,
          locale,
          website,
        }),
      });

      if (response.status === 409) {
        setErrors([{ id: "slot", message: t("errorTaken"), target: "grupa-termin" }]);
        setStartMin(null);
        // Odświeżamy siatkę godzin - ktoś właśnie zajął ten termin.
        setDate((current) => current);
        return;
      }

      if (response.status === 429) {
        setErrors([{ id: "rate", message: t("errorRate"), target: "grupa-termin" }]);
        return;
      }

      if (!response.ok) throw new Error("request_failed");

      const data = (await response.json()) as { id: string };
      setBookingId(data.id);
    } catch {
      setErrors([{ id: "server", message: t("errorServer"), target: "grupa-termin" }]);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setBookingId(null);
    setServiceId(null);
    setStylistId(null);
    setDate(null);
    setStartMin(null);
    setName("");
    setPhone("");
    setEmail("");
    setNote("");
    setConsent(false);
    setErrors([]);
  }

  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message;

  const summaryDate =
    date && startMin !== null
      ? `${formatDate(date, locale)}, ${minutesToTime(startMin)}`
      : date
        ? formatDate(date, locale)
        : t("summaryEmpty");

  return (
    <section className="section booking-form" id="rezerwacja">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
          <p className="head-side">{t("side")}</p>
        </div>

        {/* Formularz naprawdę zapisuje dane do bazy, a salon jest fikcyjny.
            Ta informacja musi być przy formularzu, a nie schowana w polityce
            prywatności - inaczej ktoś w dobrej wierze zostawi swój numer. */}
        <p className="demo-note">{t("demoNote")}</p>

        <div className="form-grid">
          {bookingId ? (
            <div className="confirm" tabIndex={-1} ref={successBox}>
              <h3>{t("successTitle")}</h3>
              <p>{t("successBody", { id: bookingId })}</p>
              <div className="actions">
                <a className="btn btn-primary" href={`tel:${SALON.phone}`}>
                  {t("callUs", { phone: SALON.phoneDisplay })}
                </a>
                <button className="btn btn-ghost" type="button" onClick={reset}>
                  {t("successAnother")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              {errors.length > 0 && (
                <div className="error-summary" tabIndex={-1} ref={errorBox} role="alert">
                  <h3>{t("errorTitle")}</h3>
                  <ul>
                    {errors.map((error) => (
                      <li key={error.id}>
                        <a
                          href={`#${error.target}`}
                          onClick={(event) => {
                            event.preventDefault();
                            const el = document.getElementById(error.target);
                            el?.scrollIntoView({ block: "center" });
                            const focusable =
                              el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
                                ? el
                                : el?.querySelector<HTMLElement>("input, textarea");
                            focusable?.focus({ preventScroll: true });
                          }}
                        >
                          {error.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <fieldset className="fieldset" id="grupa-usluga">
                <legend>
                  <span className="num">1</span> {t("stepService")}
                </legend>
                <div className="opts opts--2">
                  {BOOKABLE_SERVICES.map((item) => (
                    <label className="opt" key={item.id}>
                      <input
                        type="radio"
                        name="serviceId"
                        value={item.id}
                        checked={serviceId === item.id}
                        onChange={() => {
                          setServiceId(item.id);
                          // Rozgrzewamy fragment z walidacją - do wysyłki
                          // zostało kilka kroków, więc zdąży się pobrać.
                          void import("@/lib/booking-schema");
                        }}
                      />
                      <span className="box">
                        <b>{ts(`items.${item.id}.name`)}</b>
                        <em>{ts("from", { price: item.priceFrom ?? 0 })}</em>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend>
                  <span className="num">2</span> {t("stepStylist")}
                </legend>
                <div className="opts opts--2">
                  <label className="opt">
                    <input
                      type="radio"
                      name="stylistId"
                      value=""
                      checked={stylistId === null}
                      onChange={() => setStylistId(null)}
                    />
                    <span className="box">
                      <b>{t("anyStylist")}</b>
                    </span>
                  </label>
                  {STYLISTS.map((stylist) => {
                    const disabled = !!service && !service.stylists.includes(stylist.id);
                    return (
                      <label className="opt" key={stylist.id}>
                        <input
                          type="radio"
                          name="stylistId"
                          value={stylist.id}
                          checked={stylistId === stylist.id}
                          disabled={disabled}
                          onChange={() => setStylistId(stylist.id)}
                        />
                        <span className="box">
                          <b>{tt(`members.${stylist.id}.name`)}</b>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="fieldset" id="grupa-termin">
                <legend>
                  <span className="num">3</span> {t("stepDate")}
                </legend>

                <div className="opts opts--chips">
                  {days.map((day) => {
                    const short = formatDateShort(day, locale);
                    return (
                      <label className="opt" key={day}>
                        <input
                          type="radio"
                          name="date"
                          value={day}
                          checked={date === day}
                          onChange={() => setDate(day)}
                        />
                        <span className="box">
                          <b>{short.weekday}</b>
                          <em>{short.day}</em>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <p className="slots-hint" aria-live="polite">
                  {!serviceId || !date
                    ? t("pickDayFirst")
                    : loadingSlots
                      ? t("loadingSlots")
                      : slots && slots.some((s) => s.available)
                        ? ""
                        : t("noSlots")}
                </p>

                {slots && slots.length > 0 && (
                  <div className="opts opts--chips">
                    {slots.map((slot) => (
                      <label className="opt" key={slot.startMin}>
                        <input
                          type="radio"
                          name="startMin"
                          value={slot.startMin}
                          disabled={!slot.available}
                          checked={startMin === slot.startMin}
                          onChange={() => setStartMin(slot.startMin)}
                        />
                        <span className="box">
                          <b>{slot.time}</b>
                          {!slot.available && (
                            <span className="visually-hidden">{t("slotTaken")}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <fieldset className="fieldset">
                <legend>
                  <span className="num">4</span> {t("stepContact")}
                </legend>

                <div className="field" data-invalid={errorFor("name") ? "true" : undefined}>
                  <label htmlFor="imie">
                    {t("name")} <span className="req">*</span>
                  </label>
                  <input
                    id="imie"
                    name="imie"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={errorFor("name") ? true : undefined}
                    aria-describedby={errorFor("name") ? "imie-err" : undefined}
                  />
                  {errorFor("name") && (
                    <p className="err" id="imie-err">
                      {errorFor("name")}
                    </p>
                  )}
                </div>

                <div className="field" data-invalid={errorFor("phone") ? "true" : undefined}>
                  <label htmlFor="telefon">
                    {t("phone")} <span className="req">*</span>
                  </label>
                  <input
                    id="telefon"
                    name="telefon"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={errorFor("phone") ? true : undefined}
                    aria-describedby={`telefon-hint${errorFor("phone") ? " telefon-err" : ""}`}
                  />
                  <p className="hint" id="telefon-hint">
                    {t("phoneHint")}
                  </p>
                  {errorFor("phone") && (
                    <p className="err" id="telefon-err">
                      {errorFor("phone")}
                    </p>
                  )}
                </div>

                <div className="field" data-invalid={errorFor("email") ? "true" : undefined}>
                  <label htmlFor="mail">{t("email")}</label>
                  <input
                    id="mail"
                    name="mail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={errorFor("email") ? true : undefined}
                    aria-describedby={`mail-hint${errorFor("email") ? " mail-err" : ""}`}
                  />
                  <p className="hint" id="mail-hint">
                    {t("emailHint")}
                  </p>
                  {errorFor("email") && (
                    <p className="err" id="mail-err">
                      {errorFor("email")}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="uwagi">{t("note")}</label>
                  <textarea
                    id="uwagi"
                    name="uwagi"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-describedby="uwagi-hint"
                  />
                  <p className="hint" id="uwagi-hint">
                    {t("noteHint")}
                  </p>
                </div>

                {/* Pułapka na boty: ukryta przed człowiekiem i przed czytnikiem ekranu. */}
                <div className="visually-hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="consent">
                  <input
                    id="zgoda"
                    name="zgoda"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-invalid={errorFor("consent") ? true : undefined}
                    aria-describedby={errorFor("consent") ? "zgoda-err" : undefined}
                  />
                  <label htmlFor="zgoda">
                    {t("consent")} <span className="req">*</span>
                  </label>
                </div>
                {errorFor("consent") && (
                  <p className="err" id="zgoda-err" style={{ marginBottom: "var(--sp-3)" }}>
                    {errorFor("consent")}
                  </p>
                )}
              </fieldset>

              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? t("submitting") : t("submit")}
              </button>
            </form>
          )}

          <aside className="summary-card" aria-live="polite">
            <h3>{t("summaryTitle")}</h3>
            <dl className="summary-list">
              <div>
                <dt>{t("summaryService")}</dt>
                <dd>{service ? ts(`items.${service.id}.name`) : t("summaryEmpty")}</dd>
              </div>
              <div>
                <dt>{t("summaryStylist")}</dt>
                <dd>{stylistId ? tt(`members.${stylistId}.name`) : t("anyStylist")}</dd>
              </div>
              <div>
                <dt>{t("summaryDate")}</dt>
                <dd>{summaryDate}</dd>
              </div>
              <div>
                <dt>{t("summaryDuration")}</dt>
                <dd>{service ? ts("minutes", { minutes: service.durationMin }) : "—"}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>{t("summaryPrice")}</span>
              <b>{service?.priceFrom ? ts("from", { price: service.priceFrom }) : "—"}</b>
            </div>
            <p className="summary-note">{t("summaryNote")}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
