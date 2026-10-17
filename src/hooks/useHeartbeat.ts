import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { heartbeat } from "@/lib/hunt.functions";
import { getToken } from "@/lib/session";

/** Keeps the participant marked as online for the admin live view. */
export function useHeartbeat(intervalMs = 30_000) {
  const sendHeartbeat = useServerFn(heartbeat);
  useEffect(() => {
    let cancelled = false;
    const ping = () => {
      const token = getToken();
      if (!token || cancelled) return;
      sendHeartbeat({ data: { token } }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, sendHeartbeat]);
}
