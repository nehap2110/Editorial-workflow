import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import FormInput from "../components/FormInput.jsx";
import Button from "../components/Button.jsx";

// Values must match the backend enum in server/src/models/User.js exactly.
const ROLE_OPTIONS = [
  {
    value: "writer",
    label: "Writer",
    description: "Draft articles and submit them for review.",
  },
  {
    value: "editor",
    label: "Editor",
    description: "Review, approve and publish articles.",
  },
];

const Register = () => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("writer");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(name, email, password, role);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      {/* Top Accent */}
      <div className="h-[3px] bg-press" />

      <div className="flex min-h-[calc(100vh-3px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-press"
          >
            <span className="text-base leading-none">←</span>
            Back to Home
          </Link>

          {/* Register Card */}
          <div className="border border-hairline bg-white p-7 shadow-sm sm:p-9">
            {/* Brand */}
            <div className="mb-8 flex items-center gap-3 border-b border-hairline pb-6">
              <div className="flex h-11 w-11 items-center justify-center bg-press">
                <span className="font-serif text-sm font-bold text-white">
                  EW
                </span>
              </div>

              <div>
                <h1 className="font-serif text-xl font-bold text-ink">
                  Editorial Workflow
                </h1>

                <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-muted">
                  Content Management Platform
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-press">
                Join the Editorial Desk
              </p>

              <h2 className="font-serif text-3xl font-bold leading-tight text-ink">
                Create your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Choose a role to get started.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 border border-press/30 bg-press/5 px-4 py-3 text-sm text-press">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormInput
                label="Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />

              <FormInput
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />

              <FormInput
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />

              {/* Role */}
              <fieldset>
                <legend className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Role
                </legend>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLE_OPTIONS.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={role === option.value}
                        onChange={(e) => setRole(e.target.value)}
                        className="peer sr-only"
                      />
                      <div className="h-full border border-hairline bg-white px-3.5 py-3 transition hover:border-muted/60 peer-checked:border-press peer-checked:ring-1 peer-checked:ring-press peer-focus-visible:ring-2 peer-focus-visible:ring-press">
                        <span className="block text-sm font-semibold text-ink">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {option.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </div>
            </form>

            {/* Login Link */}
            <div className="mt-7 border-t border-hairline pt-6 text-center">
              <p className="text-sm text-muted">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-press transition hover:text-ink hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.12em] text-muted/70">
            Join your editorial team and start creating
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;