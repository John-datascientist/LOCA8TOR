import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import { countryList, type CountryCode } from "@/lib/countries";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/button";

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<CountryCode>("NG");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          country,
        },
      },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    router.replace("/(tabs)");
  }

  if (checkEmail) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.logo}>WEGIVE</Text>
          <Text style={styles.title}>Check your email</Text>
          <View style={styles.checkEmailBox}>
            <Text style={styles.checkEmailText}>
              We sent a confirmation link to {email}. Follow it to activate
              your account, then log in.
            </Text>
          </View>
          <Link href="/(auth)/login" style={[styles.footerLink, { textAlign: "center", marginTop: 20 }]}>
            Back to log in
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>WEGIVE</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Give and get in your community.</Text>

          <View style={styles.form}>
            <TextField label="Full name" value={fullName} onChangeText={setFullName} />
            <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
            <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password-new" />

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Country</Text>
              <View style={styles.countryRow}>
                {countryList.map((c) => (
                  <Pressable
                    key={c.code}
                    onPress={() => setCountry(c.code)}
                    style={[styles.countryPill, country === c.code && styles.countryPillActive]}
                  >
                    <Text style={[styles.countryPillText, country === c.code && styles.countryPillTextActive]}>
                      {c.code}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button label={submitting ? "Creating account…" : "Create account"} onPress={handleSubmit} loading={submitting} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Log in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  logo: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.ink,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    textTransform: "uppercase",
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 20,
    gap: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.foreground,
  },
  countryRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  countryPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  countryPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
  },
  countryPillTextActive: {
    color: colors.surface,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.warn,
    backgroundColor: colors.warnLight,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    color: colors.warn,
  },
  checkEmailBox: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandLight,
    padding: 16,
    marginTop: 16,
  },
  checkEmailText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
