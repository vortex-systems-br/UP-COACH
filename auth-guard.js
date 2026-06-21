/* =========================================================
   UP COACH — AUTH GUARD
   Login simples para uso interno do União Paquerê.
========================================================= */

const UP_COACH_AUTH_USER = "uniao";
const UP_COACH_AUTH_PASS = "052026";
const UP_COACH_AUTH_KEY = "upCoachAuth_v1";

document.documentElement.classList.add("up-auth-pending");

(function injectInitialAuthStyle() {
  const style = document.createElement("style");
  style.id = "upCoachAuthInitialStyle";
  style.textContent = `
    html.up-auth-pending .app-shell {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();

document.addEventListener("DOMContentLoaded", () => {
  injectAuthStyles();

  if (isUPCoachLoggedIn()) {
    unlockUPCoachApp();
    injectLogoutButton();
    return;
  }

  lockUPCoachApp();
  injectLoginScreen();
});

function isUPCoachLoggedIn() {
  try {
    return localStorage.getItem(UP_COACH_AUTH_KEY) === "authorized";
  } catch (error) {
    return false;
  }
}

function unlockUPCoachApp() {
  document.documentElement.classList.remove("up-auth-pending");
  document.body.classList.remove("up-coach-locked");

  const loginScreen = document.getElementById("upCoachLoginScreen");

  if (loginScreen) {
    loginScreen.remove();
  }
}

function lockUPCoachApp() {
  document.documentElement.classList.add("up-auth-pending");
  document.body.classList.add("up-coach-locked");
}

function injectAuthStyles() {
  if (document.getElementById("upCoachAuthStyles")) return;

  const style = document.createElement("style");
  style.id = "upCoachAuthStyles";

  style.textContent = `
    body.up-coach-locked {
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(215,163,60,0.14), transparent 28%),
        radial-gradient(circle at top right, rgba(90,15,27,0.26), transparent 34%),
        linear-gradient(180deg, #05070d 0%, #020309 100%);
    }

    .up-login-screen {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: grid;
      place-items: center;
      padding: 22px;
      background:
        radial-gradient(circle at top, rgba(245,196,92,0.12), transparent 32%),
        radial-gradient(circle at bottom right, rgba(90,15,27,0.28), transparent 38%),
        linear-gradient(180deg, #05070d 0%, #020309 100%);
      color: #fff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .up-login-card {
      width: 100%;
      max-width: 390px;
      padding: 24px 18px;
      border-radius: 26px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.030));
      border: 1px solid rgba(215,163,60,0.26);
      box-shadow: 0 22px 70px rgba(0,0,0,0.48);
    }

    .up-login-badge {
      width: 76px;
      height: 76px;
      margin: 0 auto 16px;
      display: grid;
      place-items: center;
      border-radius: 25px;
      color: #f5c45c;
      font-weight: 950;
      font-size: 27px;
      background:
        radial-gradient(circle at top left, rgba(245,196,92,0.28), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      border: 1px solid rgba(245,196,92,0.58);
      box-shadow: 0 16px 34px rgba(215,163,60,0.16);
    }

    .up-login-card h1 {
      margin: 0;
      text-align: center;
      font-size: 32px;
      line-height: 1;
      letter-spacing: -1px;
    }

    .up-login-card h1 span {
      color: #f5c45c;
      font-style: italic;
    }

    .up-login-card p {
      margin: 8px 0 20px;
      text-align: center;
      color: #aeb7c7;
      font-size: 13px;
      line-height: 1.45;
    }

    .up-login-card label {
      display: block;
      margin: 13px 0 7px;
      color: #aeb7c7;
      font-size: 13px;
      font-weight: 750;
    }

    .up-login-card input {
      width: 100%;
      min-height: 50px;
      border-radius: 15px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.055);
      color: #fff;
      padding: 0 14px;
      outline: none;
      font-size: 15px;
      box-sizing: border-box;
    }

    .up-login-card input:focus {
      border-color: rgba(245,196,92,0.62);
      box-shadow: 0 0 0 3px rgba(245,196,92,0.08);
    }

    .up-login-button {
      width: 100%;
      min-height: 52px;
      margin-top: 17px;
      border-radius: 16px;
      border: 1px solid rgba(215,163,60,0.72);
      color: #171103;
      font-size: 15px;
      font-weight: 950;
      background: linear-gradient(180deg, #f5c45c, #d7a33c);
      box-shadow: 0 14px 26px rgba(215,163,60,0.16);
      cursor: pointer;
    }

    .up-login-button:active {
      transform: scale(0.985);
    }

    .up-login-error {
      display: none;
      margin-top: 12px;
      padding: 11px 12px;
      border-radius: 14px;
      color: #ffd2d2;
      background: rgba(217,83,79,0.18);
      border: 1px solid rgba(217,83,79,0.38);
      font-size: 13px;
      line-height: 1.4;
    }

    .up-login-footer {
      margin-top: 16px;
      text-align: center;
      color: rgba(255,255,255,0.40);
      font-size: 11px;
    }

    .up-logout-button {
      position: fixed;
      top: calc(env(safe-area-inset-top) + 12px);
      right: max(14px, calc((100vw - 430px) / 2 + 14px));
      z-index: 9999;
      min-width: 58px;
      height: 34px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      color: #f5c45c;
      background: rgba(5,7,13,0.76);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .up-logout-button:active {
      transform: scale(0.985);
    }
  `;

  document.head.appendChild(style);
}

function injectLoginScreen() {
  if (document.getElementById("upCoachLoginScreen")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "up-login-screen";
  wrapper.id = "upCoachLoginScreen";

  wrapper.innerHTML = `
    <section class="up-login-card">
      <div class="up-login-badge">UP</div>

      <h1><span>UP</span> Coach</h1>
      <p>Acesso interno do União Paquerê</p>

      <form id="upCoachLoginForm">
        <label for="upCoachUserInput">Usuário</label>
        <input
          id="upCoachUserInput"
          type="text"
          autocomplete="username"
          placeholder="Digite o usuário"
        />

        <label for="upCoachPasswordInput">Senha</label>
        <input
          id="upCoachPasswordInput"
          type="password"
          autocomplete="current-password"
          placeholder="Digite a senha"
        />

        <button class="up-login-button" type="submit">
          Entrar no app
        </button>

        <div class="up-login-error" id="upCoachLoginError">
          Usuário ou senha incorretos.
        </div>
      </form>

      <div class="up-login-footer">
        Banco de Campo Inteligente
      </div>
    </section>
  `;

  document.body.appendChild(wrapper);

  const form = document.getElementById("upCoachLoginForm");
  const userInput = document.getElementById("upCoachUserInput");
  const passwordInput = document.getElementById("upCoachPasswordInput");

  if (form) {
    form.addEventListener("submit", handleUPCoachLogin);
  }

  setTimeout(() => {
    if (userInput) userInput.focus();
  }, 150);

  if (passwordInput) {
    passwordInput.addEventListener("input", hideLoginError);
  }

  if (userInput) {
    userInput.addEventListener("input", hideLoginError);
  }
}

function handleUPCoachLogin(event) {
  event.preventDefault();

  const userInput = document.getElementById("upCoachUserInput");
  const passwordInput = document.getElementById("upCoachPasswordInput");
  const error = document.getElementById("upCoachLoginError");

  const user = String(userInput?.value || "").trim().toLowerCase();
  const password = String(passwordInput?.value || "").trim();

  if (user === UP_COACH_AUTH_USER && password === UP_COACH_AUTH_PASS) {
    try {
      localStorage.setItem(UP_COACH_AUTH_KEY, "authorized");
    } catch (error) {
      console.error("Erro ao salvar login:", error);
    }

    unlockUPCoachApp();
    injectLogoutButton();
    return;
  }

  if (error) {
    error.style.display = "block";
  }

  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.focus();
  }
}

function hideLoginError() {
  const error = document.getElementById("upCoachLoginError");

  if (error) {
    error.style.display = "none";
  }
}

function injectLogoutButton() {
  if (document.getElementById("upCoachLogoutButton")) return;

  const button = document.createElement("button");
  button.id = "upCoachLogoutButton";
  button.className = "up-logout-button";
  button.type = "button";
  button.textContent = "Sair";
  button.onclick = logoutUPCoach;

  document.body.appendChild(button);
}

function logoutUPCoach() {
  const confirmLogout = confirm("Sair do UP Coach?");

  if (!confirmLogout) return;

  try {
    localStorage.removeItem(UP_COACH_AUTH_KEY);
  } catch (error) {
    console.error("Erro ao sair:", error);
  }

  window.location.reload();
}

window.logoutUPCoach = logoutUPCoach;
