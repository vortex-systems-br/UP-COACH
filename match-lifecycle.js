/* =========================================================
   UP COACH — MATCH LIFECYCLE
   Encerrar partida atual e preparar novo jogo mantendo elenco.
========================================================= */

const UP_COACH_LIFECYCLE_STATE_KEY = "upCoachState_v2";
const UP_COACH_LIFECYCLE_ARCHIVE_KEY = "upCoachArchivedMatches_v1";

document.addEventListener("DOMContentLoaded", () => {
  injectLifecycleStyles();
  injectLifecyclePanel();
  renderLifecycleStatus();
});

function injectLifecycleStyles() {
  if (document.getElementById("matchLifecycleStyles")) return;

  const style = document.createElement("style");
  style.id = "matchLifecycleStyles";
  style.textContent = `
    .lifecycle-actions {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .lifecycle-status {
      margin-top: 14px;
      padding: 13px;
      border-radius: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .lifecycle-status strong {
      color: var(--white);
    }

    .lifecycle-warning {
      color: var(--gold-2);
    }

    .lifecycle-ok {
      color: #7ee0a1;
    }

    .lifecycle-danger-button {
      width: 100%;
      min-height: 50px;
      border-radius: 15px;
      font-weight: 850;
      margin-top: 0;
      color: #fff;
      background: rgba(217, 83, 79, 0.22);
      border: 1px solid rgba(217, 83, 79, 0.50);
      box-shadow: 0 10px 24px rgba(217, 83, 79, 0.10);
    }

    .lifecycle-danger-button:active,
    .lifecycle-actions button:active {
      transform: scale(0.985);
    }
  `;

  document.head.appendChild(style);
}

function injectLifecyclePanel() {
  const summaryScreen = document.getElementById("summaryScreen");

  if (!summaryScreen) return;
  if (document.getElementById("matchLifecyclePanel")) return;

  summaryScreen.insertAdjacentHTML(
    "beforeend",
    `
    <section class="panel" id="matchLifecyclePanel">
      <h2>Fim de Jogo</h2>
      <p>Depois de arquivar a partida, finalize o jogo atual e prepare o app para uma nova partida mantendo o elenco salvo.</p>

      <div class="lifecycle-actions">
        <button class="primary-button" onclick="finishCurrentMatchKeepingSquad()">
          Encerrar e preparar nova partida
        </button>

        <button class="secondary-button" onclick="renderLifecycleStatus()">
          Verificar status da partida
        </button>

        <button class="lifecycle-danger-button" onclick="clearCurrentMatchWithoutArchiveCheck()">
          Limpar partida sem arquivar
        </button>
      </div>

      <div class="lifecycle-status" id="lifecycleStatus">
        Verificando status da partida...
      </div>
    </section>
    `
  );
}

function getLifecycleState() {
  try {
    const raw = localStorage.getItem(UP_COACH_LIFECYCLE_STATE_KEY);

    if (!raw) {
      return {
        match: {},
        players: [],
        lineup: {},
        events: []
      };
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Erro ao ler estado do UP Coach:", error);

    return {
      match: {},
      players: [],
      lineup: {},
      events: []
    };
  }
}

function saveLifecycleState(state) {
  localStorage.setItem(UP_COACH_LIFECYCLE_STATE_KEY, JSON.stringify(state));
}

function getArchivedMatchesLifecycle() {
  try {
    return JSON.parse(localStorage.getItem(UP_COACH_LIFECYCLE_ARCHIVE_KEY) || "[]");
  } catch (error) {
    console.error("Erro ao ler partidas arquivadas:", error);
    return [];
  }
}

function hasCurrentMatchData(state) {
  const match = state.match || {};
  const events = Array.isArray(state.events) ? state.events : [];

  return Boolean(
    match.active ||
    match.opponent ||
    match.place ||
    events.length > 0 ||
    Number(match.homeScore || 0) > 0 ||
    Number(match.awayScore || 0) > 0
  );
}

function buildLifecycleMatchKeyFromState(state) {
  const match = state.match || {};

  return [
    match.createdAt || "sem-data",
    match.opponent || "adversario",
    match.place || "sem-local",
    match.homeScore || 0,
    match.awayScore || 0
  ].join("|");
}

function buildLifecycleMatchKeyFromArchive(item) {
  const match = item.match || {};

  return [
    match.createdAt || "sem-data",
    match.opponent || "adversario",
    match.place || "sem-local",
    match.homeScore || 0,
    match.awayScore || 0
  ].join("|");
}

function isCurrentMatchArchived(state) {
  const archivedMatches = getArchivedMatchesLifecycle();
  const currentKey = buildLifecycleMatchKeyFromState(state);

  return archivedMatches.some((item) => {
    return buildLifecycleMatchKeyFromArchive(item) === currentKey;
  });
}

function renderLifecycleStatus() {
  const status = document.getElementById("lifecycleStatus");

  if (!status) return;

  const state = getLifecycleState();
  const match = state.match || {};
  const events = Array.isArray(state.events) ? state.events : [];
  const players = Array.isArray(state.players) ? state.players : [];

  if (!hasCurrentMatchData(state)) {
    status.innerHTML = `
      <strong>Status:</strong> nenhuma partida em andamento.<br>
      Elenco salvo: ${players.length} jogador(es).
    `;
    return;
  }

  const archived = isCurrentMatchArchived(state);
  const homeScore = Number(match.homeScore || 0);
  const awayScore = Number(match.awayScore || 0);
  const opponent = escapeLifecycleHTML(match.opponent || "Adversário não informado");

  status.innerHTML = `
    <strong>Partida atual:</strong> União Paquerê ${homeScore} x ${awayScore} ${opponent}<br>
    <strong>Lances registrados:</strong> ${events.length}<br>
    <strong>Elenco salvo:</strong> ${players.length} jogador(es)<br>
    <strong>Status do arquivo:</strong>
    ${
      archived
        ? `<span class="lifecycle-ok">partida já arquivada.</span>`
        : `<span class="lifecycle-warning">partida ainda não arquivada.</span>`
    }
  `;
}

function buildCleanStateKeepingSquad(state) {
  const players = Array.isArray(state.players) ? state.players : [];

  return {
    ...state,

    match: {
      active: false,
      opponent: "",
      place: "",
      type: "Amistoso",
      period: "1º Tempo",
      homeScore: 0,
      awayScore: 0,
      createdAt: null,
      finishedAt: null
    },

    lineup: {
      formation: "2-3-2",
      selectedPlayerIds: [],
      positions: {}
    },

    events: [],

    selectedPlayerId: null,
    selectedPlayer: null,
    mode: "tatico",
    currentScreen: "homeScreen",

    timer: {
      running: false,
      seconds: 0,
      startedAt: null,
      elapsedBeforeStart: 0
    },

    clock: {
      running: false,
      seconds: 0,
      startedAt: null,
      elapsedBeforeStart: 0
    },

    players
  };
}

function finishCurrentMatchKeepingSquad() {
  const state = getLifecycleState();

  if (!hasCurrentMatchData(state)) {
    alert("Não há partida atual para encerrar.");
    return;
  }

  const match = state.match || {};
  const homeScore = Number(match.homeScore || 0);
  const awayScore = Number(match.awayScore || 0);
  const opponent = match.opponent || "Adversário";

  const archived = isCurrentMatchArchived(state);

  if (!archived) {
    const confirmWithoutArchive = confirm(
      "Esta partida ainda não foi arquivada.\n\n" +
      `União Paquerê ${homeScore} x ${awayScore} ${opponent}\n\n` +
      "O recomendado é arquivar a partida antes de encerrar.\n\n" +
      "Deseja continuar mesmo assim?"
    );

    if (!confirmWithoutArchive) return;
  }

  const confirmFinish = confirm(
    "Encerrar partida atual e preparar novo jogo?\n\n" +
    "O elenco será mantido.\n" +
    "Placar, lances, escalação e cronômetro serão limpos."
  );

  if (!confirmFinish) return;

  const cleanState = buildCleanStateKeepingSquad(state);

  saveLifecycleState(cleanState);

  alert("Partida encerrada. O app será atualizado para preparar o próximo jogo.");

  window.location.reload();
}

function clearCurrentMatchWithoutArchiveCheck() {
  const state = getLifecycleState();

  if (!hasCurrentMatchData(state)) {
    alert("Não há dados de partida para limpar.");
    return;
  }

  const confirmClear = confirm(
    "Atenção: isso vai limpar a partida atual sem arquivar.\n\n" +
    "O elenco será mantido, mas placar, lances, escalação e cronômetro serão apagados.\n\n" +
    "Deseja continuar?"
  );

  if (!confirmClear) return;

  const confirmAgain = confirm(
    "Confirma a limpeza da partida atual?\n\n" +
    "Use essa opção apenas se já tiver certeza."
  );

  if (!confirmAgain) return;

  const cleanState = buildCleanStateKeepingSquad(state);

  saveLifecycleState(cleanState);

  alert("Partida atual limpa. O elenco foi mantido.");

  window.location.reload();
}

function escapeLifecycleHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.finishCurrentMatchKeepingSquad = finishCurrentMatchKeepingSquad;
window.clearCurrentMatchWithoutArchiveCheck = clearCurrentMatchWithoutArchiveCheck;
window.renderLifecycleStatus = renderLifecycleStatus;