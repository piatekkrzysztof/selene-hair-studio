import type { ReactNode } from "react";

// Layout główny jest celowo pusty: całe <html> ustawia layout językowy,
// bo dopiero on zna wartość atrybutu lang.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
