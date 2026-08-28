import type { Metadata } from "next";
import { LoginForm } from "@/components/panel/LoginForm";

export const metadata: Metadata = {
  title: "Logowanie · Panel Sélene",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="panel-login">
      <div className="panel-login-card">
        <p className="eyebrow">Panel salonu</p>
        <h1>Sélene Hair Studio</h1>
        <LoginForm />
      </div>
    </main>
  );
}
