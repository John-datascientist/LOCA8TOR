import { supabase } from "../supabase/client";

// Read by App.tsx's post-redirect listener to scope the business/rider
// Google-signin restriction to signins that actually went through this
// module, without touching normal email/password SIGNED_IN events.
export const GOOGLE_SIGNIN_PENDING_KEY = "l8:pending_google_signin";

type SocialProvider = "google" | "apple" | "microsoft";

// Supabase's provider enum spells Microsoft's provider "azure".
const PROVIDER_MAP: Record<SocialProvider, "google" | "apple" | "azure"> = {
  google: "google",
  apple: "apple",
  microsoft: "azure",
};

type SignInOptions = {
  redirect_uri?: string;
};

export const socialAuth = {
  signInWithOAuth: async (provider: SocialProvider, opts?: SignInOptions) => {
    if (provider === "google") {
      sessionStorage.setItem(GOOGLE_SIGNIN_PENDING_KEY, "1");
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: PROVIDER_MAP[provider],
      options: {
        redirectTo: opts?.redirect_uri ?? window.location.origin,
      },
    });

    if (error) {
      return { error };
    }

    // signInWithOAuth navigates the browser away to the provider; supabase-js
    // picks the session back up from the redirect URL automatically on return.
    return { redirected: true, url: data?.url };
  },
};
