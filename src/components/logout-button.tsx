"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not log out. Please try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <div className="logout-control">
      {error && <span className="form-error" role="alert">{error}</span>}
      <button type="button" className="button button-outline button-small" onClick={logout}>
        Log out <LogOut size={14} />
      </button>
    </div>
  );
}
