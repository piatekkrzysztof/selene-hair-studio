"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth-config";
import { verifyPassword } from "@/lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  verifySessionToken,
} from "@/lib/session";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";

/**
 * Sesję sprawdzamy również tutaj, mimo że middleware chroni nawigację.
 * Akcja serwerowa to zwykły POST pod adres strony - opieranie autoryzacji
 * wyłącznie na middleware to jedna warstwa za mało.
 */
async function requireSession(): Promise<string> {
  const { secret } = authConfig();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const subject = await verifySessionToken(token, secret);
  if (!subject) redirect("/panel/login");
  return subject;
}

export async function login(
  _state: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const ip = clientIpFrom(await headers());

  // Logowanie jest limitowane ostrzej niż rezerwacja - to jedyny punkt,
  // w którym da się zgadywać hasło.
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Za dużo prób logowania. Spróbuj ponownie za kwadrans." };
  }

  const user = String(formData.get("user") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!user || !password) {
    return { error: "Podaj login i hasło." };
  }

  const config = authConfig();

  // Ten sam komunikat dla złego loginu i złego hasła - inaczej formularz
  // podpowiada, który login istnieje.
  const passwordOk = await verifyPassword(password, config.passwordHash);
  if (user !== config.user || !passwordOk) {
    return { error: "Nieprawidłowy login lub hasło." };
  }

  const token = await createSessionToken(user, config.secret);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/panel",
    maxAge: SESSION_MAX_AGE_S,
  });

  redirect("/panel");
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/panel" });
  redirect("/panel/login");
}

export async function confirmBooking(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.booking.update({ where: { id }, data: { status: "CONFIRMED" } });
  revalidatePath("/panel");
}

export async function cancelBooking(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Odwołanie nie usuwa wpisu: zwalnia termin (silnik pomija CANCELLED),
  // ale zostawia ślad, gdyby klient zadzwonił z pretensją.
  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/panel");
}
