import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Check,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  Wallet,
} from "lucide-react";
import { Brand, Field } from "./ui";
import { supabase, authRedirect } from "./lib/client";
import { navigate, type Route } from "./lib/navigation";
import { errorMessage } from "./AccountApp";

export function AuthPage({
  route,
  session,
  initialError,
  onDemo,
}: {
  route: Route;
  session: Session | null;
  initialError: string;
  onDemo: () => void;
}) {
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState(() => {
    try {
      return sessionStorage.getItem("budgetflow.verify-email") || "";
    } catch {
      return "";
    }
  });
  const [cooldown, setCooldown] = useState(0);
  const signup = route === "signup";
  const verify = route === "verify-email";
  const forgot = route === "forgot-password";
  const reset = route === "reset-password";
  const callback = route === "auth-callback";
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    if (session && (route === "login" || signup || callback))
      navigate("overview");
    if (callback && !session)
      setError(
        "This email link could not be completed. Open it in the browser where you requested it, or request a new link.",
      );
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      setError(
        "This email link has expired or could not be verified. Please request a new one.",
      );
      history.replaceState(null, "", window.location.pathname);
    }
  }, [session, route, signup, callback]);
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const address = String(form.get("email") || email).trim();
    const password = String(form.get("password") || "");
    try {
      if (signup) {
        if (password !== form.get("confirm-password"))
          throw new Error("Your passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: authRedirect("/auth/callback"),
            data: {
              display_name: String(form.get("name")).trim(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
        });
        if (error) throw error;
        if (data.session) navigate("overview");
        else {
          try {
            sessionStorage.setItem("budgetflow.verify-email", address);
          } catch {
            /* Verification screen still works. */
          }
          navigate("verify-email");
        }
      } else if (verify) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: address,
          options: { emailRedirectTo: authRedirect("/auth/callback") },
        });
        if (error) throw error;
        setNotice(
          "If this address needs confirmation, a fresh link is on its way. Check your spam folder too.",
        );
        setCooldown(60);
      } else if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: authRedirect("/reset-password"),
        });
        if (error) throw error;
        setNotice(
          "If there’s an account with this address, you’ll receive a password reset link. Open it in this browser.",
        );
        setCooldown(60);
      } else if (reset) {
        if (!session)
          throw new Error(
            "Open a fresh password reset link in this browser first.",
          );
        if (password !== form.get("confirm-password"))
          throw new Error("Your passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        navigate("overview");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error) throw error;
        try {
          sessionStorage.removeItem("budgetflow.verify-email");
        } catch {
          /* No sensitive plan data is stored here. */
        }
        navigate("overview");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  const title = signup
    ? "A fresh start for your money."
    : verify
      ? "Check your inbox."
      : forgot
        ? "Let’s get you back in."
        : reset
          ? "Choose a new password."
          : callback
            ? "Let’s finish signing in."
            : "Welcome back.";
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <span className="auth-kicker">
            <Leaf size={17} /> A LITTLE MORE INTENTION
          </span>
          <h1>
            Give every dollar
            <br />a little direction.
          </h1>
          <p>
            Your income, your everyday expenses, your next big thing. Make room
            for all of it.
          </p>
          <div className="auth-example">
            <span>
              <Wallet size={22} /> YOUR MONTH, AT A GLANCE
            </span>
            <div>
              <p>
                Income planned<strong>$10,000</strong>
              </p>
              <p>
                Budget allocated<strong>$7,000</strong>
              </p>
            </div>
            <div className="auth-example-savings">
              <span>
                <Check size={18} /> Room for your future
              </span>
              <strong>$3,000</strong>
            </div>
            <small>Example plan · No bank connection needed</small>
          </div>
        </div>
        <p className="auth-story-footer">
          A little planning. More room to live.
        </p>
      </aside>
      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-card">
          <span className="auth-symbol">
            {verify || forgot ? <Mail size={27} /> : <LockKeyhole size={27} />}
          </span>
          <h2>{title}</h2>
          <p className="auth-description">
            {signup
              ? "Create your BudgetFlow account and start with a clean month."
              : verify
                ? "Use the confirmation link in your email to open your private workspace. Open it in the same browser."
                : forgot
                  ? "Enter your email and we’ll send you a reset link."
                  : reset
                    ? "Use at least 12 characters. This password also applies to your Settle Up account."
                    : callback
                      ? "Use a new confirmation link or log in with your verified email."
                      : "Log in to pick up where your plan left off."}
          </p>
          {error && (
            <div className="auth-feedback danger" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="auth-feedback" role="status">
              {notice}
            </div>
          )}
          {!callback && (
            <form onSubmit={submit} className="auth-form">
              <fieldset disabled={pending}>
                {signup && (
                  <Field label="Your name">
                    <input
                      name="name"
                      autoComplete="name"
                      maxLength={100}
                      required
                      placeholder="What should we call you?"
                    />
                  </Field>
                )}
                {!reset && (
                  <Field label="Email address">
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={254}
                      placeholder="you@example.com"
                    />
                  </Field>
                )}
                {!forgot && !verify && (
                  <>
                    <Field
                      label={reset ? "New password" : "Password"}
                      hint={
                        signup || reset ? "At least 12 characters." : undefined
                      }
                    >
                      <span className="password-input">
                        <input
                          type={visible ? "text" : "password"}
                          name="password"
                          autoComplete={
                            signup || reset
                              ? "new-password"
                              : "current-password"
                          }
                          minLength={signup || reset ? 12 : undefined}
                          maxLength={128}
                          required
                          placeholder={
                            signup || reset
                              ? "Create a strong password"
                              : "Enter your password"
                          }
                        />
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={
                            visible ? "Hide password" : "Show password"
                          }
                          onClick={() => setVisible((v) => !v)}
                        >
                          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </span>
                    </Field>
                    {(signup || reset) && (
                      <Field label="Confirm password">
                        <input
                          type={visible ? "text" : "password"}
                          name="confirm-password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={128}
                          required
                          placeholder="Enter your password again"
                        />
                      </Field>
                    )}
                  </>
                )}
                {!signup && !forgot && !reset && !verify && (
                  <button
                    type="button"
                    className="text-button auth-forgot"
                    onClick={() => navigate("forgot-password")}
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  type="submit"
                  className="primary auth-submit"
                  disabled={cooldown > 0}
                >
                  {pending
                    ? "One moment…"
                    : cooldown > 0
                      ? "Try again in " + cooldown + "s"
                      : signup
                        ? "Create account"
                        : verify
                          ? "Resend confirmation email"
                          : forgot
                            ? "Send reset link"
                            : reset
                              ? "Save new password"
                              : "Log in"}
                </button>
              </fieldset>
            </form>
          )}
          <div className="auth-switch">
            {signup ? (
              <>
                Already have an account?{" "}
                <button
                  className="text-button"
                  onClick={() => navigate("login")}
                >
                  Log in
                </button>
              </>
            ) : forgot || reset || verify || callback ? (
              <button className="text-button" onClick={() => navigate("login")}>
                Back to login
              </button>
            ) : (
              <>
                New to BudgetFlow?{" "}
                <button
                  className="text-button"
                  onClick={() => navigate("signup")}
                >
                  Create an account
                </button>
              </>
            )}
          </div>
          {!verify && !reset && !callback && (
            <>
              <div className="auth-divider">
                <span>Take a look around first</span>
              </div>
              <button className="secondary auth-demo" onClick={onDemo}>
                Explore the example
              </button>
            </>
          )}
          <p className="auth-small">
            <LockKeyhole size={14} /> Your plan is private to your account.
          </p>
          {!signup && !verify && !forgot && !reset && !callback && (
            <p className="auth-shared">
              Already use Settle Up? Use the same email and password.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
