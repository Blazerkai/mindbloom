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

    const fields = slot.querySelector("#auth-fields");
    fields.innerHTML = mode === "signup"
      ? `<input id="f-name" placeholder="Your name" />
         <input id="f-email" placeholder="Email" type="email" />
         <input id="f-password" placeholder="Password" type="password" />`
      : `<input id="f-email" placeholder="Email" type="email" />
         <input id="f-password" placeholder="Password" type="password" />`;

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
      <input id="p-name" placeholder="Name" />
      <input id="p-school" placeholder="School" />
      <input id="p-grade" placeholder="Grade" />
      <input id="p-goal" placeholder="Main goal (e.g. Ace my finals)" />
      <button id="p-submit" class="gradient-btn" style="width:100%;">Get Started</button>
    </div>
  `));
  container.querySelector("#p-submit").addEventListener("click", async () => {
    const btn = container.querySelector("#p-submit");
    btn.disabled = true;
    await profileRepo.save({
      name: container.querySelector("#p-name").value.trim() || "Bloomer",
      school: container.querySelector("#p-school").value.trim(),
      grade: container.querySelector("#p-grade").value.trim(),
      goal: container.querySelector("#p-goal").value.trim(),
    });
    onDone();
  });
}
