import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { saveSession } from "../../lib/auth.js";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = useMemo(() => {
    return !form.confirmPassword || form.password === form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  const isValid = useMemo(() => {
    return (
      form.fullName.trim() &&
      form.email.trim() &&
      form.phone.trim() &&
      form.password.trim() &&
      form.confirmPassword.trim() &&
      form.password === form.confirmPassword
    );
  }, [form]);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isValid) {
      setError("Please complete all fields and make sure passwords match.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      };

      const { data } = await api.post("/auth/register-parent", payload);
      saveSession(data);
      setMessage("Account created successfully.");
      navigate("/parent/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container-main py-8 sm:py-10 md:py-14">
      <div className="mx-auto grid max-w-[1120px] overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden bg-gradient-to-br from-[#f2d37b] via-[#eba892] to-[#a8bb8d] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
          <div>
            <div className="text-3xl font-black tracking-tight">kidgage</div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/95">
              Create your parent account to discover activities, compare
              academies, and manage your child bookings in one place.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[22px] bg-white/15 p-5 backdrop-blur">
              <div className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Parent account
              </div>
              <div className="mt-2 text-2xl font-black">Fast sign up</div>
            </div>

            <div className="rounded-[22px] bg-white/15 p-5 backdrop-blur">
              <div className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Child bookings
              </div>
              <div className="mt-2 text-2xl font-black">
                Manage everything easily
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 md:p-8 lg:p-10">
          <div className="mx-auto max-w-[460px]">
            <div className="lg:hidden">
              <div className="text-3xl font-black tracking-tight text-slate-900">
                kidgage
              </div>
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Parent Registration
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Create your account to book activities, manage children, and track
              upcoming sessions.
            </p>

            <form className="mt-8 space-y-4" onSubmit={submit}>
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Full name
                </div>
                <input
                  className="h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Email
                </div>
                <input
                  type="email"
                  className="h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Phone
                </div>
                <input
                  className="h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="+974 000 0000"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    Password
                  </div>
                  <input
                    type="password"
                    className="h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                    placeholder="Create password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    Confirm password
                  </div>
                  <input
                    type="password"
                    className={`h-[54px] w-full rounded-[18px] border bg-white px-4 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 ${
                      passwordsMatch
                        ? "border-slate-300 focus:border-slate-500"
                        : "border-red-300 focus:border-red-400"
                    }`}
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      updateField("confirmPassword", e.target.value)
                    }
                  />
                </label>
              </div>

              {!passwordsMatch ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  Passwords do not match.
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {message}
                </div>
              ) : null}

              <button
                disabled={submitting}
                className="flex h-[56px] w-full items-center justify-center rounded-[18px] bg-sage px-4 text-base font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-sage transition hover:opacity-80"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
