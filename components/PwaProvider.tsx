"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const SW_PATH = "/sw.js";

export function PwaProvider({ children }: Props) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      } catch (error) {
        console.error("No se pudo registrar el service worker", error);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return <>{children}</>;
}
