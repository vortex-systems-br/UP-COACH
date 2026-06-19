/* =========================================================
   UP COACH — LINEUP MANAGER
   Titulares e banco para escalação manual 7 + 1.
========================================================= */

const UP_COACH_LINEUP_MANAGER_STATE_KEY = "upCoachState_v2";

document.addEventListener("DOMContentLoaded", () => {
  injectLineupManagerStyles();
  injectLineupManagerPanel();
  renderLineupManager();

  const observer = new MutationObserver(() => {
    injectLineupManagerPanel();
    renderLineupManager();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

function injectLineupManagerStyles() {
  if (document.getElementById("lineupManagerStyles")) return;

  const style = document.createElement("style");
  style.id = "lineupManagerStyles";

  style.textContent = `
    .lineup-manager-panel {
      margin-top: 14px;
      padding: 16px;
      border-radius: var(--radius);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.070), rgba(255,255,255,0.030));
      border: 1px solid var(--border);
      box-shadow: 0 14px 42px rgba(0,0,0,0.23);
    }

    .lineup-manager-panel h2 {
      margin: 0 0 6px;
      font-size: 21px;
      letter-spacing: -0.4px;
    }

    .lineup-manager-panel p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .lineup-counter {
      margin-top: 12px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .lineup-counter strong {
      color: var(--gold-2);
    }

    .lineup-manager-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-top: 12px;
    }

    .lineup-manager-actions button {
      min-height: 44px;
      border-radius: 14px;
      font-weight: 850;
      font-size: 12px;
      color: var(--white);
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.10);
    }

    .lineup-manager-actions button:first-child {
      color: #171103;
      background: linear-gradient(180deg, var(--gold-2), var(--gold));
      border-color: rgba(215,163,60,0.72);
    }

    .lineup-section-title {
      margin: 16px 0 8px;
      color: var(--white);
      font-size: 14px;
      font-weight: 900;
    }

    .lineup-player-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 9px;
    }

    .lineup-player-button {
      min-height: 58px;
      padding: 10px;
      border-radius: 15px;
      text-align: left;
      color: var(--white);
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .lineup-player-button.selected {
      background:
        radial-gradient(circle at top left, rgba(245,196,92,0.20), transparent 42%),
        rgba(215,163,60,0.10);
      border-color: rgba(245,196,92,0.58);
    }

    .lineup-player-button.goalie {
      border-color: rgba(245,196,92,0.40);
    }

    .lineup-player-button strong {
      display: block;
      font-size: 13px;
      font-weight: 950;
    }

    .lineup-player-button small {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.25;
    }

    .lineup-player-button.selected small {
      color: #f6d789;
    }

    .lineup-empty-message {
      padding: 12px;
      border-radius: 14px;
      color: var(--muted);
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.06);
      font-size: 13px;
      line-height: 1.45;
    }

    .lineup-warning {
      color: var(--gold-2);
      font-weight: 850;
    }

    .lineup-danger {
      color: #ffaaaa;
      font-weight: 850;
    }

    .lineup-player-button:active,
    .lineup-manager-actions button:active {
      transform: scale(0.985);
    }
  `;

  document.head.appendChild(style);
}

function injectLineupManagerPanel() {
  const lineupScreen = document.getElementById("lineupScreen");

  if (!lineupScreen) return;
  if (document.getElementById("lineupManagerPanel")) return;

  lineupScreen.insertAdjacentHTML(
    "beforeend",
    `
      <section class="lineup-manager-panel" id="lineupManagerPanel">
        <h2>Titulares e Banco</h2>
        <p>Escolha manualmente quem entra no campo. O limite é 7 na linha + 1 goleiro.</p>

        <div class="lineup-counter" id="lineupManagerCounter">
          Carregando escalação...
        </div>

        <div class="lineup-manager-actions">
          <button onclick="autoSelectLineupManager()">
            Autoescalar 7 + 1
          </button>

          <button onclick="clearLineupManager()">
            Limpar escalação
          </button>
        </div>

        <div class="lineup-section-title">Titulares</div>
        <div class="lineup-player-grid" id="lineupStartersList"></div>

        <div class="lineup-section-title">Banco</div>
        <div class="lineup-player-grid" id="lineupBenchList"></div>
      </section>
    `
  );
}

function getLineupManagerState() {
  try {
    const raw = localStorage.getItem(UP_COACH_LINEUP_MANAGER_STATE_KEY);

    if (!raw) {
      return {
        match: {},
        players: [],
        lineup: {
          formation: "2-3-2",
          selectedPlayerIds: [],
          positions: {}
        },
        events: []
      };
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Erro ao ler estado da escalação:", error);

    return {
      match: {},
      players: [],
      lineup: {
        formation: "2-3-2",
        selectedPlayerIds: [],
        positions: {}
      },
      events: []
    };
  }
}

function saveLineupManagerState(state) {
  localStorage.setItem(UP_COACH_LINEUP_MANAGER_STATE_KEY, JSON.stringify(state));
}

function renderLineupManager() {
  const startersList = document.getElementById("lineupStartersList");
  const benchList = document.getElementById("lineupBenchList");
  const counter = document.getElementById("lineupManagerCounter");

  if (!startersList || !benchList || !counter) return;

  const state = getLineupManagerState();
  const players = Array.isArray(state.players) ? state.players : [];
  const lineup = normalizeLineupManagerLineup(state.lineup || {}, players);

  const selectedIds = Array.isArray(lineup.selectedPlayerIds)
    ? lineup.selectedPlayerIds
    : [];

  const starters = selectedIds
    .map((id) => players.find((player) => player.id === id))
    .filter(Boolean);

  const bench = players.filter((player) => !selectedIds.includes(player.id));

  const lineCount = starters.filter((player) => !isGoalkeeper(player)).length;
  const goalieCount = starters.filter((player) => isGoalkeeper(player)).length;

  counter.innerHTML = `
    <strong>Titulares:</strong> ${starters.length}/8<br>
    <strong>Linha:</strong> ${lineCount}/7<br>
    <strong>Goleiro:</strong> ${goalieCount}/1
    ${
      goalieCount === 0
        ? `<br><span class="lineup-warning">Nenhum goleiro selecionado.</span>`
        : ``
    }
    ${
      lineCount > 7
        ? `<br><span class="lineup-danger">Há jogadores de linha acima do limite.</span>`
        : ``
    }
  `;

  startersList.innerHTML = starters.length
    ? starters.map((player) => buildLineupPlayerButton(player, true)).join("")
    : `<div class="lineup-empty-message">Nenhum titular selecionado ainda.</div>`;

  benchList.innerHTML = bench.length
    ? bench.map((player) => buildLineupPlayerButton(player, false)).join("")
    : `<div class="lineup-empty-message">Nenhum jogador no banco.</div>`;
}

function buildLineupPlayerButton(player, selected) {
  const number = escapeLineupHTML(player.number || "-");
  const name = escapeLineupHTML(player.name || "Jogador");
  const position = escapeLineupHTML(player.position || "-");
  const id = escapeLineupHTML(player.id);

  const classes = [
    "lineup-player-button",
    selected ? "selected" : "",
    isGoalkeeper(player) ? "goalie" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button class="${classes}" onclick="toggleLineupPlayer('${id}')">
      <strong>${number} — ${name}</strong>
      <small>${position} • ${selected ? "Titular" : "Banco"}</small>
    </button>
  `;
}

function toggleLineupPlayer(playerId) {
  const state = getLineupManagerState();
  const players = Array.isArray(state.players) ? state.players : [];
  const player = players.find((item) => item.id === playerId);

  if (!player) {
    alert("Jogador não encontrado.");
    return;
  }

  const lineup = normalizeLineupManagerLineup(state.lineup || {}, players);
  let selectedIds = Array.isArray(lineup.selectedPlayerIds)
    ? [...lineup.selectedPlayerIds]
    : [];

  const alreadySelected = selectedIds.includes(playerId);

  if (alreadySelected) {
    selectedIds = selectedIds.filter((id) => id !== playerId);

    if (lineup.positions) {
      delete lineup.positions[playerId];
    }
  } else {
    if (isGoalkeeper(player)) {
      const currentGoalkeeper = selectedIds
        .map((id) => players.find((item) => item.id === id))
        .find((item) => item && isGoalkeeper(item));

      if (currentGoalkeeper) {
        const confirmReplace = confirm(
          `Já existe goleiro escalado: ${currentGoalkeeper.name}.\n\nDeseja substituir por ${player.name}?`
        );

        if (!confirmReplace) return;

        selectedIds = selectedIds.filter((id) => id !== currentGoalkeeper.id);

        if (lineup.positions) {
          delete lineup.positions[currentGoalkeeper.id];
        }
      }

      selectedIds.push(playerId);
    } else {
      const linePlayers = selectedIds
        .map((id) => players.find((item) => item.id === id))
        .filter((item) => item && !isGoalkeeper(item));

      if (linePlayers.length >= 7) {
        alert("Limite atingido: máximo de 7 jogadores de linha.");
        return;
      }

      selectedIds.push(playerId);
    }
  }

  const normalizedSelectedIds = normalizeSelectedOrder(selectedIds, players);
  const positions = rebuildPositionsForSelected(normalizedSelectedIds, players, lineup.positions || {});

  const newState = {
    ...state,
    lineup: {
      ...lineup,
      formation: lineup.formation || "2-3-2",
      selectedPlayerIds: normalizedSelectedIds,
      positions
    }
  };

  saveLineupManagerState(newState);
  refreshLineupManagerScreen();
}

function autoSelectLineupManager() {
  const state = getLineupManagerState();
  const players = Array.isArray(state.players) ? state.players : [];

  if (players.length === 0) {
    alert("Cadastre jogadores no elenco antes de escalar.");
    return;
  }

  const goalkeeper = players.find((player) => isGoalkeeper(player));
  const linePlayers = players.filter((player) => !isGoalkeeper(player)).slice(0, 7);

  if (!goalkeeper) {
    alert("Nenhum goleiro cadastrado. Cadastre um jogador com posição GOL.");
    return;
  }

  if (linePlayers.length < 7) {
    const confirmLess = confirm(
      `Você possui apenas ${linePlayers.length} jogador(es) de linha.\n\nDeseja autoescalar mesmo assim?`
    );

    if (!confirmLess) return;
  }

  const selectedIds = normalizeSelectedOrder(
    [...linePlayers.map((player) => player.id), goalkeeper.id],
    players
  );

  const lineup = state.lineup || {};
  const positions = rebuildPositionsForSelected(selectedIds, players, {});

  const newState = {
    ...state,
    lineup: {
      ...lineup,
      formation: lineup.formation || "2-3-2",
      selectedPlayerIds: selectedIds,
      positions
    }
  };

  saveLineupManagerState(newState);
  refreshLineupManagerScreen();
}

function clearLineupManager() {
  const confirmClear = confirm(
    "Limpar escalação atual?\n\nOs jogadores continuam cadastrados no elenco."
  );

  if (!confirmClear) return;

  const state = getLineupManagerState();
  const lineup = state.lineup || {};

  const newState = {
    ...state,
    lineup: {
      ...lineup,
      formation: lineup.formation || "2-3-2",
      selectedPlayerIds: [],
      positions: {}
    }
  };

  saveLineupManagerState(newState);
  refreshLineupManagerScreen();
}

function normalizeLineupManagerLineup(lineup, players) {
  const selectedIds = Array.isArray(lineup.selectedPlayerIds)
    ? lineup.selectedPlayerIds
    : [];

  const validIds = selectedIds.filter((id) => {
    return players.some((player) => player.id === id);
  });

  return {
    formation: lineup.formation || "2-3-2",
    selectedPlayerIds: normalizeSelectedOrder(validIds, players),
    positions: lineup.positions || {}
  };
}

function normalizeSelectedOrder(selectedIds, players) {
  const uniqueIds = [...new Set(selectedIds)];

  const goalkeepers = uniqueIds.filter((id) => {
    const player = players.find((item) => item.id === id);
    return player && isGoalkeeper(player);
  });

  const linePlayers = uniqueIds.filter((id) => {
    const player = players.find((item) => item.id === id);
    return player && !isGoalkeeper(player);
  });

  return [...linePlayers.slice(0, 7), ...goalkeepers.slice(0, 1)];
}

function rebuildPositionsForSelected(selectedIds, players, existingPositions) {
  const positions = {};
  const template = getLineupFormationTemplate();

  selectedIds.forEach((id, index) => {
    const existing = existingPositions[id];

    if (existing && typeof existing.left === "number" && typeof existing.top === "number") {
      positions[id] = existing;
      return;
    }

    positions[id] = template[index] || { left: 46, top: 50 };
  });

  return positions;
}

function getLineupFormationTemplate() {
  const state = getLineupManagerState();
  const formation = state.lineup?.formation || "2-3-2";

  const templates = {
    "2-3-2": [
      { left: 34, top: 13 },
      { left: 58, top: 13 },
      { left: 20, top: 38 },
      { left: 45, top: 40 },
      { left: 70, top: 38 },
      { left: 34, top: 65 },
      { left: 58, top: 65 },
      { left: 46, top: 84 }
    ],
    "3-2-2": [
      { left: 20, top: 14 },
      { left: 46, top: 13 },
      { left: 70, top: 14 },
      { left: 34, top: 41 },
      { left: 58, top: 41 },
      { left: 34, top: 66 },
      { left: 58, top: 66 },
      { left: 46, top: 84 }
    ],
    "2-2-3": [
      { left: 34, top: 13 },
      { left: 58, top: 13 },
      { left: 34, top: 38 },
      { left: 58, top: 38 },
      { left: 20, top: 65 },
      { left: 46, top: 66 },
      { left: 70, top: 65 },
      { left: 46, top: 84 }
    ],
    livre: [
      { left: 34, top: 13 },
      { left: 58, top: 13 },
      { left: 20, top: 38 },
      { left: 45, top: 40 },
      { left: 70, top: 38 },
      { left: 34, top: 65 },
      { left: 58, top: 65 },
      { left: 46, top: 84 }
    ]
  };

  return templates[formation] || templates["2-3-2"];
}

function refreshLineupManagerScreen() {
  renderLineupManager();

  const lineupScreen = document.getElementById("lineupScreen");
  const isLineupVisible = lineupScreen && lineupScreen.classList.contains("active");

  if (isLineupVisible) {
    window.location.reload();
  }
}

function isGoalkeeper(player) {
  return String(player?.position || "").trim().toUpperCase() === "GOL";
}

function escapeLineupHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.toggleLineupPlayer = toggleLineupPlayer;
window.autoSelectLineupManager = autoSelectLineupManager;
window.clearLineupManager = clearLineupManager;
window.renderLineupManager = renderLineupManager;