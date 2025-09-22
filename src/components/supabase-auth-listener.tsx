"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function SupabaseAuthListener({ onLogin }: { onLogin?: (user: any) => void }) {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (onLogin) onLogin(session.user);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [onLogin]);
  return null;
}
