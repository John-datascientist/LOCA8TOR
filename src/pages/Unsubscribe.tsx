import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailMinus } from "lucide-react";
import SEO from "@/components/SEO";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Status =
  | "validating"
  | "ready"
  | "already"
  | "invalid"
  | "submitting"
  | "success"
  | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(data?.error || "Invalid or expired link");
          return;
        }
        if (data?.valid === true) setStatus("ready");
        else if (data?.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      } catch {
        setStatus("invalid");
        setErrorMsg("Could not reach the server");
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else {
        setStatus("error");
        setErrorMsg(data?.error || "Failed to unsubscribe");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <>
      <SEO
        title="Unsubscribe | Loca8tor"
        description="Manage your Loca8tor email preferences and unsubscribe from marketing or notification emails. Update your subscription settings anytime."
        path="/unsubscribe"
      />
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailMinus className="h-7 w-7 text-primary" />
            </div>
          </div>

          {status === "validating" && (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Checking your link…</p>
            </div>
          )}

          {status === "ready" && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Unsubscribe from emails?
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                You'll stop receiving app emails from Loca8tor. You can still
                sign in and use your account normally.
              </p>
              <Button onClick={confirm} className="w-full" size="lg">
                Confirm unsubscribe
              </Button>
            </div>
          )}

          {status === "submitting" && (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Processing…</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground mb-2">You're unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                We won't send you any more app emails. Sorry to see you go!
              </p>
            </div>
          )}

          {status === "already" && (
            <div className="text-center">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Already unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                This email address has already been removed from our list.
              </p>
            </div>
          )}

          {(status === "invalid" || status === "error") && (
            <div className="text-center">
              <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {status === "invalid" ? "Invalid link" : "Something went wrong"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {errorMsg || "This unsubscribe link is invalid or has expired."}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Unsubscribe;