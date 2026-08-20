import { authService } from "../authService.js";
import { profileRepo } from "../repositories.js";
import { el } from "../utils.js";
import { icon } from "../icons.js";

export function renderAuthGate(onSignedIn) {
  const slot = document.getElementById("auth-form-slot");
  let mode = "login";

  function draw() {
    slot.innerHTML = "";
    slot.appendChild(el(`
      <div>
        ${authService.backend === "supabase" ? `
        <button id="google-signin" class="ghost-btn" style="width:100%;margin-bottom:0.9rem;">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.53 5.53 0 01-2.4 3.63v3h3.89c2.27-2.09 3.55-5.17 3.55-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.89-3a7.4 7.4 0 01-11-3.9H1.05v3.09A12 12 0 0012 24z"/><path fill="#FBBC05" d="M5.06 14.19a7.2 7.2 0 010-4.38V6.72H1.05a12 12 0 000 10.56l4.01-3.09z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 001.05 6.72l4.01 3.09A7.15 7.15 0 0112 4.77z"/></svg>
          Continue with Google
        </button>
        <div class="auth-divider"><span>or</span></div>
        ` : ""}
        <div class="auth-tabs">
          <button data-mode="login" class="${mode === "login" ? "active" : ""}">Log In</button>
          <button data-mode="signup" class="${mode === "signup" ? "active" : ""}">Sign Up</button>
        </div>
        <div id="auth-fields"></div>
        <p class="auth-error" id="auth-error" style="display:none;"></p>
        <button id="auth-submit" class="gradient-btn" style="width:100%;">${mode === "login" ? "Log In" : "Create Account"}</button>
        <p style="text-align:center;margin-top:0.8rem;">
          <a href="#" id="forgot-link" style="color:var(--text-lo);font-size:0.85rem;">Forgot password?</a>
        </p>
      </div>
    `));

    if (authService.backend === "supabase") {
      slot.querySelector("#google-signin").addEventListener("click", async () => {
        const errorEl = slot.querySelector("#auth-error");
        try {
          await authService.loginWithGoogle();
        } catch (e) {
          errorEl.style.color = "var(--danger)";
          errorEl.textContent = e.message;
          errorEl.style.display = "block";
        }
      });
    }

    const fields = slot.querySelector("#auth-fields");
    fields.innerHTML = mode === "signup"
      ? `<input id="f-name" placeholder="Your name" aria-label="Your name" />
         <input id="f-email" placeholder="Email" type="email" aria-label="Email" />
         <input id="f-password" placeholder="Password" type="password" aria-label="Password" />`
      : `<input id="f-email" placeholder="Email" type="email" aria-label="Email" />
         <input id="f-password" placeholder="Password" type="password" aria-label="Password" />`;

    slot.querySelectorAll(".auth-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => { mode = btn.dataset.mode; draw(); });
    });

    slot.querySelector("#auth-submit").addEventListener("click", async () => {
      const errorEl = slot.querySelector("#auth-error");
      errorEl.style.display = "none";
      const submitBtn = slot.querySelector("#auth-submit");
      try {
        const email = slot.querySelector("#f-email").value.trim();
        const password = slot.querySelector("#f-password").value;
        if (!email || !password) throw new Error("Please fill in all fields.");
        submitBtn.disabled = true;
        if (mode === "signup") {
          const name = slot.querySelector("#f-name").value.trim() || "Bloomer";
          const result = await authService.signup({ email, password, name });
          if (result.needsEmailConfirmation) {
            errorEl.style.display = "block";
            errorEl.style.color = "var(--good)";
            errorEl.textContent = "Account created — check your email to confirm, then log in.";
            submitBtn.disabled = false;
            return;
          }
        } else {
          await authService.login({ email, password });
        }
        onSignedIn();
      } catch (e) {
        errorEl.style.color = "var(--danger)";
        errorEl.textContent = e.message;
        errorEl.style.display = "block";
        submitBtn.disabled = false;
      }
    });

    slot.querySelector("#forgot-link").addEventListener("click", async (ev) => {
      ev.preventDefault();
      const email = prompt("Enter your account email:");
      if (!email) return;
      try {
        if (authService.backend === "supabase") {
          await authService.resetPassword({ email });
          alert("Password reset email sent — check your inbox.");
        } else {
          const newPassword = prompt("Enter a new password:");
          if (!newPassword) return;
          await authService.resetPassword({ email, newPassword });
          alert("Password updated. You can log in now.");
        }
      } catch (e) {
        alert(e.message);
      }
    });
  }

  draw();
}

export function renderProfileSetup(container, onDone) {
  container.innerHTML = "";
  container.appendChild(el(`
    <div class="auth-card glass-card" style="margin: 2rem auto;">
      <div class="brand">
        <span class="brand-logo">${icon("leaf", { size: 22 })}</span>
        <h1>Set up your profile</h1><p>A few quick details to personalize MindBloom</p>
      </div>
      <input id="p-name" placeholder="Name" aria-label="Name" />
      <input id="p-school" placeholder="School" aria-label="School" />
      <input id="p-grade" placeholder="Grade" aria-label="Grade" />
      <input id="p-goal" placeholder="Main goal (e.g. Ace my finals)" aria-label="Main goal" />
      <p class="auth-error" id="p-error" style="display:none;"></p>
      <button id="p-submit" class="gradient-btn" style="width:100%;">Get Started</button>
    </div>
  `));
  container.querySelector("#p-submit").addEventListener("click", async () => {
    const btn = container.querySelector("#p-submit");
    const errorEl = container.querySelector("#p-error");
    errorEl.style.display = "none";
    btn.disabled = true;
    try {
      await profileRepo.save({
        name: container.querySelector("#p-name").value.trim() || "Bloomer",
        school: container.querySelector("#p-school").value.trim(),
        grade: container.querySelector("#p-grade").value.trim(),
        goal: container.querySelector("#p-goal").value.trim(),
      });
      onDone();
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
      btn.disabled = false;
    }
  });
}
