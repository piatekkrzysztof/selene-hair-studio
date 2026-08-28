import messages from "../../messages/pl.json";

/**
 * Etykiety dla panelu. Panel jest jednojęzyczny, więc czyta polskie
 * tłumaczenia bezpośrednio, zamiast ciągnąć za sobą całe next-intl.
 * Źródło jest to samo, co dla strony publicznej - nazwy nie mogą się rozjechać.
 */

const serviceItems = messages.services.items as Record<string, { name: string }>;
const teamMembers = messages.team.members as Record<string, { name: string }>;

export function serviceName(id: string): string {
  return serviceItems[id]?.name ?? id;
}

export function stylistName(id: string | null): string {
  if (!id) return "nieprzypisana";
  return teamMembers[id]?.name ?? id;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "oczekuje",
  CONFIRMED: "potwierdzona",
  CANCELLED: "odwołana",
};
