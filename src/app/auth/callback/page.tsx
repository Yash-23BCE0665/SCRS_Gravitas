"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email;
        const res = await fetch("/api/auth/participant-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, google: true, name: session.user.user_metadata?.name || session.user.email }),
        });
        const result = await res.json();
        if (res.ok && result.user && result.user.password) {
          router.replace("/");
        } else if (res.ok && result.user && !result.user.password) {
          router.replace("/onboarding");
        } else {
          // Not registered for event or error
          setError(result.message || "You are not registered for any event.");
          toast({
            variant: "destructive",
            title: "Login Error",
            description: result.message || "You are not registered for any event.",
          });
        }
      } else {
        setError("No user session found.");
        toast({
          variant: "destructive",
          title: "Login Error",
          description: "No user session found.",
        });
      }
    });
  }, [router, toast]);

  return (
    <div className="flex flex-col justify-center items-center h-64">
      Signing you in...
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
}
