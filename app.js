/* =========================================================
   UP COACH — APP.JS
   Banco de Campo Inteligente — União Paquerê

   Versão corrigida:
   - Não sobrescreve posições manuais ao recarregar
   - Formação livre preserva o desenho tático
   - Goleiro sempre fica no slot do gol
   - Gol do adversário funcionando
   - Troca de período funcionando
   - Apagar último lance funcionando
   - Remover jogador funcionando
   - Toque sem arrastar não gera ajuste tático falso
   - Salvamento automático no localStorage
========================================================= */

const STORAGE_KEY = "upCoachState_v2";

let appState = {
  screen: "homeScreen",
  mode: "tatico",

  players: [
    { id: "p1", name: "Gabriel", number: 1, position: "Goleiro" },
    { id: "p2", name: "Lucas", number: 3, position: "Lateral direito" },
    { id: "p3", name: "João", number: 4, position: "Zagueiro" },
    { id: "p4", name: "Renan", number: 5, position: "Zagueiro" },
    { id: "p5", name: "Pedro", number: 6, position: "Primeiro volante" },
    { id: "p6", name: "Vitinho", number: 7, position: "Lateral esquerdo" },
    { id: "p7", name: "Felipe", number: 8, position: "Segundo volante" },
    { id: "p8", name: "André", number: 9, position: "Centro avante" },
    { id: "p9", name: "Mota", number: 10, position: "Meio campo" },
    { id: "p10", name: "Caio", number: 11, position: "Atacante" }
  ],

  match: {
    active: false,
    opponent: "Adversário",
    place: "",
    type: "Amistoso",
    homeScore: 0,
    awayScore: 0,
    period: "1º Tempo",
    createdAt: null
  },

  lineup: {
    formation: "2-3-2",
    selectedPlayerIds: ["p8", "p10", "p2", "p9", "p6", "p4", "p3", "p1"],
    positions: {}
  },

  timer: {
    running: false,
    startTimestamp: null,
    elapsedBeforeStart: 0
  },

  selectedPlayerId: null,
  events: []
};

let timerInterval = null;
let dragState = null;

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  normalizeStoredPlayerPositions();

  normalizeLineupOrder();

  registerServiceWorker();

  enhanceInterface();

  syncFormationSelect();

  renderAll();

  showScreen(appState.screen || "homeScreen", false);

  setMode(appState.mode || "tatico");

  updateTimerDisplay();

  if (appState.timer.running) {
    startTimerLoop();
  }
});

/* =========================================================
   SALVAR / CARREGAR MEMÓRIA
========================================================= */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.error("Erro ao salvar estado:", error);
  }
}

function loadState() {
  try {
    const savedV2 = localStorage.getItem(STORAGE_KEY);
    const savedV1 = localStorage.getItem("upCoachState_v1");
    const saved = savedV2 || savedV1;

    if (!saved) return;

    const parsed = JSON.parse(saved);

    appState = {
      ...appState,
      ...parsed,
      match: {
        ...appState.match,
        ...(parsed.match || {})
      },
      lineup: {
        ...appState.lineup,
        ...(parsed.lineup || {})
      },
      timer: {
        ...appState.timer,
        ...(parsed.timer || {})
      }
    };
  } catch (error) {
    console.error("Erro ao carregar estado:", error);
  }
}

function resetAppData() {
  const confirmReset = confirm("Tem certeza que deseja apagar todos os dados do UP Coach?");

  if (!confirmReset) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("upCoachState_v1");

  location.reload();
}

/* =========================================================
   SERVICE WORKER
========================================================= */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        console.warn("Service Worker ainda não registrado:", error);
      });
  }
}

/* =========================================================
   MELHORIAS DE INTERFACE SEM ALTERAR O HTML
========================================================= */

function enhanceInterface() {
  enhanceLiveControls();
  enhanceLastEventControls();
  enhanceSquadTools();
  enhanceLineupControls();
}

function enhanceLiveControls() {
  const scoreboard = document.querySelector(".scoreboard");
  const timerCard = document.querySelector(".timer-card");

  if (scoreboard && !document.getElementById("scoreActions")) {
    scoreboard.insertAdjacentHTML(
      "afterend",
      `
      <section class="score-actions" id="scoreActions">
        <button onclick="addHomeGoal()">+ Gol UP</button>
        <button onclick="addAwayGoal()">+ Gol Adversário</button>
      </section>
      `
    );
  }

  if (timerCard && !document.getElementById("periodControls")) {
    timerCard.insertAdjacentHTML(
      "beforeend",
      `
      <div class="period-controls" id="periodControls">
        <button onclick="changePeriod('1º Tempo')">1º</button>
        <button onclick="changePeriod('Intervalo')">Intervalo</button>
        <button onclick="changePeriod('2º Tempo')">2º</button>
        <button onclick="changePeriod('Encerrado')">Fim</button>
      </div>
      `
    );
  }
}

function enhanceLastEventControls() {
  const lastEvent = document.querySelector(".last-event");

  if (lastEvent && !document.getElementById("lastEventActions")) {
    lastEvent.insertAdjacentHTML(
      "beforeend",
      `
      <div class="last-event-actions" id="lastEventActions">
        <button onclick="deleteLastEvent()">Apagar último lance</button>
      </div>
      `
    );
  }
}

function enhanceSquadTools() {
  const squadPanel = document.querySelector("#squadScreen .panel");

  if (squadPanel && !document.getElementById("resetAppButton")) {
    squadPanel.insertAdjacentHTML(
      "beforeend",
      `
      <button class="secondary-button" id="resetAppButton" onclick="resetAppData()">
        Apagar dados do app
      </button>
      `
    );
  }
}

function enhanceLineupControls() {
  injectLineupControlsStyles();

  const lineupScreen = document.getElementById("lineupScreen");

  if (!lineupScreen) return;
  if (document.getElementById("lineupControlsPanel")) return;

  lineupScreen.insertAdjacentHTML(
    "beforeend",
    `
    <section class="lineup-manager-panel" id="lineupControlsPanel">
      <h2>Titulares e Banco</h2>
      <p>Escolha quem entra no campo. O limite é 7 jogadores de linha + 1 goleiro.</p>

      <div class="lineup-counter" id="lineupCounter">
        Carregando escalação...
      </div>

      <div class="lineup-manager-actions">
        <button onclick="autoSelectStartingLineup()">Autoescalar 7 + 1</button>
        <button onclick="clearStartingLineup()">Limpar escalação</button>
      </div>

      <div class="lineup-section-title">Titulares</div>
      <div class="lineup-player-grid" id="lineupStarters"></div>

      <div class="lineup-section-title">Banco</div>
      <div class="lineup-player-grid" id="lineupBench"></div>
    </section>
    `
  );
}

function injectLineupControlsStyles() {
  if (document.getElementById("lineupControlsStyles")) return;

  const style = document.createElement("style");
  style.id = "lineupControlsStyles";
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
      grid-column: 1 / -1;
    }

    .lineup-warning {
      color: var(--gold-2);
      font-weight: 850;
    }

    .lineup-player-button:active,
    .lineup-manager-actions button:active {
      transform: scale(0.985);
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   NAVEGAÇÃO DE TELAS
========================================================= */

function showScreen(screenId, persist = true) {
  const screens = document.querySelectorAll(".screen");

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  const target = document.getElementById(screenId);

  if (target) {
    target.classList.add("active");
  }

  appState.screen = screenId;

  updateTopbar(screenId);

  if (persist) saveState();
}

function goHome() {
  showScreen("homeScreen");
}

function updateTopbar(screenId) {
  const title = document.getElementById("screenTitle");
  const backButton = document.getElementById("backButton");

  const titles = {
    homeScreen: "UP Coach",
    matchScreen: "Nova Partida",
    squadScreen: "Elenco",
    lineupScreen: "Escalação",
    liveScreen: "Jogo ao Vivo",
    actionScreen: "Ação do Jogador",
    historyScreen: "Histórico",
    summaryScreen: "Resumo"
  };

  if (title) {
    title.textContent = titles[screenId] || "UP Coach";
  }

  if (backButton) {
    backButton.style.visibility = screenId === "homeScreen" ? "hidden" : "visible";
  }
}

/* =========================================================
   RENDERIZAÇÃO GERAL
========================================================= */

function renderAll() {
  normalizeLineupOrder();
  renderPlayerList();
  renderQuickPlayers();
  renderPitchPlayers();
  renderLineupControls();
  renderHistory();
  renderStats();
  renderMatchStatus();
  renderScoreboard();
  renderSelectedPlayer();
  updateTimerDisplay();
}

function renderMatchStatus() {
  const matchStatus = document.getElementById("matchStatus");

  if (!matchStatus) return;

  if (!appState.match.active) {
    matchStatus.textContent = "Nenhuma partida criada ainda.";
    return;
  }

  matchStatus.innerHTML = `
    <strong>Partida criada</strong><br>
    União Paquerê x ${escapeHTML(appState.match.opponent)}<br>
    <small>${escapeHTML(appState.match.place || "Local não informado")} — ${escapeHTML(appState.match.type)}</small>
  `;
}

function renderScoreboard() {
  const homeScore = document.getElementById("homeScore");
  const awayScore = document.getElementById("awayScore");

  if (homeScore) homeScore.textContent = appState.match.homeScore;
  if (awayScore) awayScore.textContent = appState.match.awayScore;
}

/* =========================================================
   ELENCO
========================================================= */

function addPlayer() {
  const nameInput = document.getElementById("playerName");
  const numberInput = document.getElementById("playerNumber");
  const positionInput = document.getElementById("playerPosition");

  const name = nameInput.value.trim();
  const number = Number(numberInput.value);
  const position = positionInput.value;

  if (!name) {
    alert("Digite o nome ou apelido do jogador.");
    return;
  }

  if (!number || number < 0) {
    alert("Digite o número do jogador.");
    return;
  }

  const player = {
    id: generateId("p"),
    name,
    number,
    position
  };

  appState.players.push(player);

  nameInput.value = "";
  numberInput.value = "";
  positionInput.value = "Atacante";

  saveState();
  renderAll();
}

function removePlayer(playerId) {
  const player = getPlayerById(playerId);

  if (!player) return;

  const confirmRemove = confirm(`Remover ${player.name} do elenco?`);

  if (!confirmRemove) return;

  appState.players = appState.players.filter((playerItem) => playerItem.id !== playerId);
  appState.lineup.selectedPlayerIds = appState.lineup.selectedPlayerIds.filter((id) => id !== playerId);

  delete appState.lineup.positions[playerId];

  if (appState.selectedPlayerId === playerId) {
    appState.selectedPlayerId = null;
  }

  saveState();
  renderAll();
}

function renderPlayerList() {
  const playerList = document.getElementById("playerList");

  if (!playerList) return;

  if (appState.players.length === 0) {
    playerList.innerHTML = `
      <div class="status-card">
        Nenhum jogador cadastrado ainda.
      </div>
    `;
    return;
  }

  const sortedPlayers = [...appState.players].sort((a, b) => Number(a.number) - Number(b.number));

  playerList.innerHTML = sortedPlayers
    .map((player) => {
      const inLineup = isPlayerInLineup(player.id);

      return `
        <article class="player-row" onclick="toggleLineupPlayer('${player.id}')">
          <div class="player-number">${player.number}</div>

          <div>
            <div class="player-name">${escapeHTML(player.name)}</div>
            <small style="color: var(--muted);">
              ${inLineup ? "Em campo" : "Toque para escalar"}
            </small>
          </div>

          <div class="player-pos">
            ${escapeHTML(getDisplayPlayerPosition(player.position))}
            <button
              onclick="event.stopPropagation(); removePlayer('${player.id}')"
              style="
                display:block;
                margin-left:auto;
                margin-top:6px;
                background:rgba(217,83,79,0.18);
                color:#fff;
                border:1px solid rgba(217,83,79,0.35);
                border-radius:10px;
                font-size:10px;
                padding:5px 7px;
              "
            >
              Remover
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function toggleLineupPlayer(playerId) {
  const player = getPlayerById(playerId);

  if (!player) return;

  const isInLineup = isPlayerInLineup(playerId);

  if (isInLineup) {
    const currentPosition = appState.lineup.positions[playerId];

    if (currentPosition) {
      appState.lineup.lastVacatedPosition = {
        left: currentPosition.left,
        top: currentPosition.top,
        isGoalkeeper: isGoalkeeper(player),
        playerId,
        playerName: player.name,
        createdAt: Date.now()
      };
    }

    appState.lineup.selectedPlayerIds = appState.lineup.selectedPlayerIds.filter((id) => id !== playerId);
    delete appState.lineup.positions[playerId];
  } else {
    if (isGoalkeeper(player)) {
      const currentGoalkeeperId = appState.lineup.selectedPlayerIds.find((id) => {
        const selectedPlayer = getPlayerById(id);
        return selectedPlayer && isGoalkeeper(selectedPlayer);
      });

      if (currentGoalkeeperId && currentGoalkeeperId !== playerId) {
        const currentGoalkeeper = getPlayerById(currentGoalkeeperId);
        const confirmReplace = confirm(
          `Já existe goleiro escalado: ${currentGoalkeeper.name}.\n\nDeseja substituir por ${player.name}?`
        );

        if (!confirmReplace) return;

        const goalkeeperPosition = appState.lineup.positions[currentGoalkeeperId];

        if (goalkeeperPosition) {
          appState.lineup.lastVacatedPosition = {
            left: goalkeeperPosition.left,
            top: goalkeeperPosition.top,
            isGoalkeeper: true,
            playerId: currentGoalkeeperId,
            playerName: currentGoalkeeper.name,
            createdAt: Date.now()
          };
        }

        appState.lineup.selectedPlayerIds = appState.lineup.selectedPlayerIds.filter((id) => id !== currentGoalkeeperId);
        delete appState.lineup.positions[currentGoalkeeperId];
      }

      appState.lineup.selectedPlayerIds.push(playerId);
    } else {
      const linePlayersCount = appState.lineup.selectedPlayerIds.filter((id) => {
        const selectedPlayer = getPlayerById(id);
        return selectedPlayer && !isGoalkeeper(selectedPlayer);
      }).length;

      if (linePlayersCount >= 7) {
        alert("Limite atingido: máximo de 7 jogadores de linha.");
        return;
      }

      appState.lineup.selectedPlayerIds.push(playerId);
    }

    normalizeLineupOrder();

    assignVacatedOrMissingPitchPosition(playerId);
  }

  normalizeLineupOrder();
  fillMissingPositionsOnly();

  saveState();
  renderAll();
}
function isPlayerInLineup(playerId) {
  return appState.lineup.selectedPlayerIds.includes(playerId);
}

function getPlayerById(playerId) {
  return appState.players.find((player) => player.id === playerId);
}

function isGoalkeeper(player) {
  return normalizePlayerPosition(player?.position) === "goleiro";
}

function normalizePlayerPosition(position) {
  const raw = String(position || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const aliases = {
    gol: "goleiro",
    goleiro: "goleiro",

    fixo: "zagueiro",
    def: "zagueiro",
    defesa: "zagueiro",
    zagueiro: "zagueiro",

    ala: "lateral direito",
    "lateral direito": "lateral direito",
    "lateral esquerdo": "lateral esquerdo",

    volante: "primeiro volante",
    "primeiro volante": "primeiro volante",
    "segundo volante": "segundo volante",

    mei: "meio campo",
    meia: "meio campo",
    "meio campo": "meio campo",

    ata: "atacante",
    atacante: "atacante",
    pivo: "centro avante",
    "centro avante": "centro avante"
  };

  return aliases[raw] || raw;
}

function getDisplayPlayerPosition(position) {
  const role = normalizePlayerPosition(position);

  const labels = {
    goleiro: "Goleiro",
    zagueiro: "Zagueiro",
    "primeiro volante": "Primeiro volante",
    "segundo volante": "Segundo volante",
    "lateral direito": "Lateral direito",
    "lateral esquerdo": "Lateral esquerdo",
    "meio campo": "Meio campo",
    atacante: "Atacante",
    "centro avante": "Centro avante"
  };

  return labels[role] || String(position || "");
}

function normalizeStoredPlayerPositions() {
  if (!Array.isArray(appState.players)) return;

  const preferredByName = {
    gabriel: "Goleiro",
    lucas: "Lateral direito",
    joao: "Zagueiro",
    renan: "Zagueiro",
    pedro: "Primeiro volante",
    vitinho: "Lateral esquerdo",
    felipe: "Segundo volante",
    andre: "Centro avante",
    mota: "Meio campo",
    caio: "Atacante"
  };

  appState.players = appState.players.map((player) => {
    const normalizedName = String(player.name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    const current = normalizePlayerPosition(player.position);
    const legacyPositions = ["gol", "fixo", "def", "ala", "mei", "ata", "pivo"];

    if (preferredByName[normalizedName] && legacyPositions.includes(String(player.position || "").trim().toLowerCase())) {
      return { ...player, position: preferredByName[normalizedName] };
    }

    return { ...player, position: getDisplayPlayerPosition(current || player.position) };
  });
}

function renderLineupControls() {
  enhanceLineupControls();

  const counter = document.getElementById("lineupCounter");
  const startersContainer = document.getElementById("lineupStarters");
  const benchContainer = document.getElementById("lineupBench");

  if (!counter || !startersContainer || !benchContainer) return;

  normalizeLineupOrder();

  const selectedIds = appState.lineup.selectedPlayerIds;
  const starters = selectedIds
    .map((id) => getPlayerById(id))
    .filter(Boolean);

  const bench = appState.players
    .filter((player) => !selectedIds.includes(player.id))
    .sort((a, b) => Number(a.number) - Number(b.number));

  const lineCount = starters.filter((player) => !isGoalkeeper(player)).length;
  const goalkeeperCount = starters.filter((player) => isGoalkeeper(player)).length;

  counter.innerHTML = `
    <strong>Titulares:</strong> ${starters.length}/8<br>
    <strong>Linha:</strong> ${lineCount}/7<br>
    <strong>Goleiro:</strong> ${goalkeeperCount}/1
    ${
      goalkeeperCount === 0
        ? `<br><span class="lineup-warning">Nenhum goleiro selecionado.</span>`
        : ``
    }
  `;

  startersContainer.innerHTML = starters.length
    ? starters.map((player) => buildLineupControlButton(player, true)).join("")
    : `<div class="lineup-empty-message">Nenhum titular selecionado ainda.</div>`;

  benchContainer.innerHTML = bench.length
    ? bench.map((player) => buildLineupControlButton(player, false)).join("")
    : `<div class="lineup-empty-message">Nenhum jogador no banco.</div>`;
}

function buildLineupControlButton(player, selected) {
  const classes = [
    "lineup-player-button",
    selected ? "selected" : "",
    isGoalkeeper(player) ? "goalie" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button class="${classes}" onclick="toggleLineupPlayer('${player.id}')">
      <strong>${escapeHTML(player.number)} — ${escapeHTML(player.name)}</strong>
      <small>${escapeHTML(getDisplayPlayerPosition(player.position))} • ${selected ? "Titular" : "Banco"}</small>
    </button>
  `;
}

function autoSelectStartingLineup() {
  if (appState.players.length === 0) {
    alert("Cadastre jogadores no elenco antes de escalar.");
    return;
  }

  const sortedPlayers = [...appState.players].sort((a, b) => Number(a.number) - Number(b.number));

  const goalkeeper = sortedPlayers.find((player) => isGoalkeeper(player));
  const linePlayers = sortedPlayers.filter((player) => !isGoalkeeper(player)).slice(0, 7);

  if (!goalkeeper) {
    alert("Cadastre pelo menos um jogador com posição GOL.");
    return;
  }

  if (linePlayers.length < 7) {
    const confirmLess = confirm(
      `Você tem apenas ${linePlayers.length} jogador(es) de linha.\n\nDeseja autoescalar mesmo assim?`
    );

    if (!confirmLess) return;
  }

  appState.lineup.selectedPlayerIds = [...linePlayers.map((player) => player.id), goalkeeper.id];
  appState.lineup.positions = {};
  delete appState.lineup.lastVacatedPosition;

  normalizeLineupOrder();
  fillMissingPositionsOnly();

  saveState();
  renderAll();
}

function clearStartingLineup() {
  const confirmClear = confirm(
    "Limpar escalação atual?\n\nOs jogadores continuam cadastrados no elenco."
  );

  if (!confirmClear) return;

  appState.lineup.selectedPlayerIds = [];
  appState.lineup.positions = {};
  delete appState.lineup.lastVacatedPosition;

  saveState();
  renderAll();
}

/* =========================================================
   NOVA PARTIDA
========================================================= */

function createMatch() {
  const opponentInput = document.getElementById("opponentInput");
  const placeInput = document.getElementById("placeInput");
  const matchTypeInput = document.getElementById("matchTypeInput");

  const opponent = opponentInput.value.trim() || "Adversário";
  const place = placeInput.value.trim();
  const type = matchTypeInput.value;

  appState.match = {
    active: true,
    opponent,
    place,
    type,
    homeScore: 0,
    awayScore: 0,
    period: "1º Tempo",
    createdAt: new Date().toISOString()
  };

  appState.events = [];

  appState.timer = {
    running: false,
    startTimestamp: null,
    elapsedBeforeStart: 0
  };

  saveState();

  renderAll();
  updateTimerDisplay();

  alert("Partida criada com sucesso.");

  showScreen("lineupScreen");
}

/* =========================================================
   PLACAR / PERÍODO
========================================================= */

function addHomeGoal() {
  appState.match.homeScore += 1;

  addSystemEvent("Gol União Paquerê", "Gol registrado para o União Paquerê");

  saveState();
  renderAll();
}

function addAwayGoal() {
  appState.match.awayScore += 1;

  addSystemEvent("Gol adversário", "Gol registrado para o adversário");

  saveState();
  renderAll();
}

function changePeriod(period) {
  appState.match.period = period;

  if (period === "Intervalo" || period === "Encerrado") {
    pauseTimerWithoutConfirm();
  }

  addSystemEvent("Período", `Partida alterada para ${period}`);

  saveState();
  renderAll();
}

/* =========================================================
   MINI CAMPO 7 + 1
========================================================= */

const formationPositions = {
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
    { left: 34, top: 13 },
    { left: 58, top: 13 },

    { left: 34, top: 39 },
    { left: 58, top: 39 },

    { left: 20, top: 65 },
    { left: 46, top: 65 },
    { left: 70, top: 65 },

    { left: 46, top: 84 }
  ],

  "2-2-3": [
    { left: 20, top: 14 },
    { left: 46, top: 13 },
    { left: 70, top: 14 },

    { left: 34, top: 41 },
    { left: 58, top: 41 },

    { left: 34, top: 66 },
    { left: 58, top: 66 },

    { left: 46, top: 84 }
  ],

  livre: []
};

function syncFormationSelect() {
  const formationSelect = document.getElementById("formationSelect");

  if (!formationSelect) return;

  formationSelect.value = appState.lineup.formation || "2-3-2";
}

function applyFormation() {
  const formationSelect = document.getElementById("formationSelect");

  if (formationSelect) {
    appState.lineup.formation = formationSelect.value;
  }

  normalizeLineupOrder();

  const formation = appState.lineup.formation || "2-3-2";

  if (formation === "livre") {
    fillMissingPositionsOnly();
    saveState();
    renderPitchPlayers();
    return;
  }

  const positions = formationPositions[formation] || formationPositions["2-3-2"];

  appState.lineup.selectedPlayerIds.forEach((playerId, index) => {
    if (!positions[index]) return;

    appState.lineup.positions[playerId] = {
      left: positions[index].left,
      top: positions[index].top
    };
  });

  addSystemEventIfMatchRunning("Formação", `Formação alterada para ${formation}`);

  saveState();
  renderPitchPlayers();
}

function fillMissingPositionsOnly() {
  appState.lineup.selectedPlayerIds.forEach((playerId) => {
    if (appState.lineup.positions[playerId]) return;

    assignMissingPitchPosition(playerId);
  });
}

function assignMissingPitchPosition(playerId) {
  const player = getPlayerById(playerId);

  if (!player) return;
  if (appState.lineup.positions[playerId]) return;

  const position = getDefaultPositionByPlayerRole(player);

  appState.lineup.positions[playerId] = {
    left: position.left,
    top: position.top
  };
}

function assignVacatedOrMissingPitchPosition(playerId) {
  const player = getPlayerById(playerId);

  if (!player) {
    assignMissingPitchPosition(playerId);
    return;
  }

  const lastVacatedPosition = appState.lineup.lastVacatedPosition;

  if (lastVacatedPosition) {
    const sameType =
      Boolean(lastVacatedPosition.isGoalkeeper) === Boolean(isGoalkeeper(player));

    if (sameType) {
      appState.lineup.positions[playerId] = {
        left: lastVacatedPosition.left,
        top: lastVacatedPosition.top
      };

      delete appState.lineup.lastVacatedPosition;
      return;
    }
  }

  assignMissingPitchPosition(playerId);
}

function getDefaultPositionByPlayerRole(player) {
  const role = normalizePlayerPosition(player?.position);

  const rolePositions = {
    goleiro: { left: 46, top: 84 },

    zagueiro: { left: 46, top: 68 },

    "primeiro volante": { left: 36, top: 55 },
    "segundo volante": { left: 56, top: 55 },

    "lateral direito": { left: 73, top: 61 },
    "lateral esquerdo": { left: 19, top: 61 },

    "meio campo": { left: 46, top: 38 },

    atacante: { left: 34, top: 18 },
    "centro avante": { left: 58, top: 15 }
  };

  if (rolePositions[role]) {
    return rolePositions[role];
  }

  const index = appState.lineup.selectedPlayerIds.indexOf(player.id);
  const fallback = formationPositions["2-3-2"][index] || formationPositions["2-3-2"][0];

  return fallback;
}

function normalizeLineupOrder() {
  const validIds = appState.lineup.selectedPlayerIds.filter((id) => getPlayerById(id));

  const goalkeepers = validIds.filter((id) => {
    const player = getPlayerById(id);
    return player && isGoalkeeper(player);
  });

  const linePlayers = validIds.filter((id) => {
    const player = getPlayerById(id);
    return player && !isGoalkeeper(player);
  });

  const limitedLinePlayers = linePlayers.slice(0, 7);
  const selectedGoalkeeper = goalkeepers[0];

  if (selectedGoalkeeper) {
    appState.lineup.selectedPlayerIds = [...limitedLinePlayers, selectedGoalkeeper];
  } else {
    appState.lineup.selectedPlayerIds = validIds.slice(0, 8);
  }
}

function renderPitchPlayers() {
  const pitch = document.getElementById("tacticalPitch");

  if (!pitch) return;

  const existingChips = pitch.querySelectorAll(".player-chip");

  existingChips.forEach((chip) => chip.remove());

  normalizeLineupOrder();
  fillMissingPositionsOnly();

  const selectedIds = appState.lineup.selectedPlayerIds.slice(0, 8);

  selectedIds.forEach((playerId, index) => {
    const player = getPlayerById(playerId);

    if (!player) return;

    let position = appState.lineup.positions[playerId];

    if (!position) {
      const fallback = formationPositions["2-3-2"][index] || formationPositions["2-3-2"][0];

      position = {
        left: fallback.left,
        top: fallback.top
      };

      appState.lineup.positions[playerId] = position;
    }

    const chip = document.createElement("button");
    chip.className = `player-chip ${isGoalkeeper(player) ? "goalie" : ""}`;
    chip.dataset.playerId = player.id;
    chip.style.left = `${position.left}%`;
    chip.style.top = `${position.top}%`;

    chip.innerHTML = `
      ${player.number}
      <small>${escapeHTML(player.name)}</small>
    `;

    chip.addEventListener("click", (event) => {
      event.stopPropagation();

      if (appState.mode === "lance") {
        selectPlayer(player.id);
      }
    });

    pitch.appendChild(chip);
  });

  setupPitchDrag();
}

function setMode(mode) {
  appState.mode = mode;

  const tacticModeBtn = document.getElementById("tacticModeBtn");
  const eventModeBtn = document.getElementById("eventModeBtn");

  if (tacticModeBtn && eventModeBtn) {
    tacticModeBtn.classList.toggle("active-mode", mode === "tatico");
    eventModeBtn.classList.toggle("active-mode", mode === "lance");
  }

  saveState();
}

function setupPitchDrag() {
  const pitch = document.getElementById("tacticalPitch");

  if (!pitch) return;

  const chips = pitch.querySelectorAll(".player-chip");

  chips.forEach((chip) => {
    chip.onpointerdown = handlePointerDown;
  });
}

function handlePointerDown(event) {
  if (appState.mode !== "tatico") return;

  const chip = event.currentTarget;
  const pitch = document.getElementById("tacticalPitch");

  if (!pitch) return;

  event.preventDefault();

  chip.setPointerCapture(event.pointerId);

  const pitchRect = pitch.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();

  const startLeft = parseFloat(chip.style.left) || 0;
  const startTop = parseFloat(chip.style.top) || 0;

  dragState = {
    chip,
    playerId: chip.dataset.playerId,
    pitchRect,
    offsetX: event.clientX - chipRect.left,
    offsetY: event.clientY - chipRect.top,
    startLeft,
    startTop,
    moved: false
  };

  chip.style.zIndex = "50";
  chip.style.transform = "scale(1.05)";

  chip.onpointermove = handlePointerMove;
  chip.onpointerup = handlePointerUp;
  chip.onpointercancel = handlePointerUp;
}

function handlePointerMove(event) {
  if (!dragState) return;

  const { chip, pitchRect, offsetX, offsetY } = dragState;

  let x = event.clientX - pitchRect.left - offsetX;
  let y = event.clientY - pitchRect.top - offsetY;

  const maxX = pitchRect.width - chip.offsetWidth;
  const maxY = pitchRect.height - chip.offsetHeight;

  x = clamp(x, 0, maxX);
  y = clamp(y, 0, maxY);

  const leftPercent = (x / pitchRect.width) * 100;
  const topPercent = (y / pitchRect.height) * 100;

  chip.style.left = `${leftPercent}%`;
  chip.style.top = `${topPercent}%`;

  const deltaLeft = Math.abs(leftPercent - dragState.startLeft);
  const deltaTop = Math.abs(topPercent - dragState.startTop);

  if (deltaLeft > 1.2 || deltaTop > 1.2) {
    dragState.moved = true;
  }
}

function handlePointerUp() {
  if (!dragState) return;

  const { chip, playerId, startLeft, startTop, moved } = dragState;

  const chipLeft = parseFloat(chip.style.left);
  const chipTop = parseFloat(chip.style.top);

  chip.style.zIndex = "5";
  chip.style.transform = "scale(1)";

  chip.onpointermove = null;
  chip.onpointerup = null;
  chip.onpointercancel = null;

  if (!moved) {
    chip.style.left = `${startLeft}%`;
    chip.style.top = `${startTop}%`;
    dragState = null;
    return;
  }

  appState.lineup.positions[playerId] = {
    left: Number(chipLeft.toFixed(2)),
    top: Number(chipTop.toFixed(2))
  };

  const player = getPlayerById(playerId);

  if (player && appState.match.active && appState.timer.running) {
    addSystemEvent("Ajuste tático", `${player.name} reposicionado no mini campo`);
  }

  dragState = null;

  saveState();
}

/* =========================================================
   JOGADORES RÁPIDOS / SELEÇÃO
========================================================= */

function renderQuickPlayers() {
  const quickPlayers = document.getElementById("quickPlayers");

  if (!quickPlayers) return;

  const selectedPlayers = appState.lineup.selectedPlayerIds
    .map((id) => getPlayerById(id))
    .filter(Boolean);

  if (selectedPlayers.length === 0) {
    quickPlayers.innerHTML = `
      <div class="status-card">
        Nenhum jogador escalado. Vá em Elenco e toque nos jogadores para escalar.
      </div>
    `;
    return;
  }

  quickPlayers.innerHTML = selectedPlayers
    .map((player) => {
      return `
        <button class="quick-player" onclick="selectPlayer('${player.id}')">
          ${player.number} — ${escapeHTML(player.name)}
          <small>${escapeHTML(getDisplayPlayerPosition(player.position))}</small>
        </button>
      `;
    })
    .join("");
}

function selectPlayer(playerId) {
  appState.selectedPlayerId = playerId;

  saveState();

  renderSelectedPlayer();

  showScreen("actionScreen");
}

function renderSelectedPlayer() {
  const player = getPlayerById(appState.selectedPlayerId);

  const numberEl = document.getElementById("selectedPlayerNumber");
  const nameEl = document.getElementById("selectedPlayerName");
  const positionEl = document.getElementById("selectedPlayerPosition");

  if (!numberEl || !nameEl || !positionEl) return;

  if (!player) {
    numberEl.textContent = "-";
    nameEl.textContent = "Nenhum jogador";
    positionEl.textContent = "-";
    return;
  }

  numberEl.textContent = player.number;
  nameEl.textContent = player.name;
  positionEl.textContent = getDisplayPlayerPosition(player.position);
}

/* =========================================================
   CRONÔMETRO
========================================================= */

function startTimer() {
  if (appState.timer.running) return;

  if (appState.match.period === "Intervalo") {
    appState.match.period = "2º Tempo";
  }

  if (appState.match.period === "Encerrado") {
    alert("A partida está encerrada. Crie uma nova partida para iniciar outro jogo.");
    return;
  }

  appState.timer.running = true;
  appState.timer.startTimestamp = Date.now();

  saveState();

  startTimerLoop();
}

function pauseTimer() {
  if (!appState.timer.running) return;

  appState.timer.elapsedBeforeStart = getElapsedMilliseconds();
  appState.timer.running = false;
  appState.timer.startTimestamp = null;

  saveState();

  stopTimerLoop();
  updateTimerDisplay();
}

function pauseTimerWithoutConfirm() {
  if (!appState.timer.running) return;

  appState.timer.elapsedBeforeStart = getElapsedMilliseconds();
  appState.timer.running = false;
  appState.timer.startTimestamp = null;

  stopTimerLoop();
  updateTimerDisplay();
}

function resetTimer() {
  const confirmReset = confirm("Zerar o cronômetro?");

  if (!confirmReset) return;

  appState.timer = {
    running: false,
    startTimestamp: null,
    elapsedBeforeStart: 0
  };

  saveState();

  stopTimerLoop();
  updateTimerDisplay();
}

function startTimerLoop() {
  stopTimerLoop();

  timerInterval = setInterval(() => {
    updateTimerDisplay();
  }, 500);

  updateTimerDisplay();
}

function stopTimerLoop() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getElapsedMilliseconds() {
  const elapsedBefore = appState.timer.elapsedBeforeStart || 0;

  if (!appState.timer.running || !appState.timer.startTimestamp) {
    return elapsedBefore;
  }

  return elapsedBefore + (Date.now() - appState.timer.startTimestamp);
}

function getTimerText() {
  const totalMilliseconds = getElapsedMilliseconds();
  const totalSeconds = Math.floor(totalMilliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getMinuteMark() {
  const totalMilliseconds = getElapsedMilliseconds();
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const minute = Math.floor(totalSeconds / 60);

  return `${minute}'`;
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timerDisplay");
  const periodLabel = document.getElementById("periodLabel");

  if (timerDisplay) {
    timerDisplay.textContent = getTimerText();
  }

  if (periodLabel) {
    periodLabel.textContent = appState.match.period || "1º Tempo";
  }
}

/* =========================================================
   REGISTRO DE EVENTOS
========================================================= */

function registerEvent(action) {
  const player = getPlayerById(appState.selectedPlayerId);

  if (!player) {
    alert("Selecione um jogador primeiro.");
    return;
  }

  if (!appState.match.active) {
    const confirmCreate = confirm("Nenhuma partida ativa. Deseja registrar mesmo assim?");

    if (!confirmCreate) return;
  }

  if (action === "Gol") {
    appState.match.homeScore += 1;
  }

  const event = {
    id: generateId("evt"),
    type: "player",
    playerId: player.id,
    playerName: player.name,
    playerNumber: player.number,
    playerPosition: player.position,
    action,
    period: appState.match.period,
    timer: getTimerText(),
    minute: getMinuteMark(),
    score: `${appState.match.homeScore}x${appState.match.awayScore}`,
    createdAt: new Date().toISOString()
  };

  appState.events.unshift(event);

  saveState();

  renderAll();

  showScreen("liveScreen");
}

function addSystemEventIfMatchRunning(action, description) {
  if (!appState.match.active) return;
  if (!appState.timer.running) return;

  addSystemEvent(action, description);
}

function addSystemEvent(action, description) {
  const event = {
    id: generateId("evt"),
    type: "system",
    playerId: null,
    playerName: null,
    playerNumber: null,
    playerPosition: null,
    action,
    description,
    period: appState.match.period,
    timer: getTimerText(),
    minute: getMinuteMark(),
    score: `${appState.match.homeScore}x${appState.match.awayScore}`,
    createdAt: new Date().toISOString()
  };

  appState.events.unshift(event);

  saveState();

  renderHistory();
  renderStats();
  renderLastEvent();
  renderScoreboard();
}

function deleteLastEvent() {
  if (appState.events.length === 0) {
    alert("Nenhum lance para apagar.");
    return;
  }

  const lastEvent = appState.events[0];

  const confirmDelete = confirm("Apagar o último lance registrado?");

  if (!confirmDelete) return;

  if (lastEvent.action === "Gol") {
    appState.match.homeScore = Math.max(0, appState.match.homeScore - 1);
  }

  if (lastEvent.action === "Gol União Paquerê") {
    appState.match.homeScore = Math.max(0, appState.match.homeScore - 1);
  }

  if (lastEvent.action === "Gol adversário") {
    appState.match.awayScore = Math.max(0, appState.match.awayScore - 1);
  }

  appState.events.shift();

  saveState();

  renderAll();
}

function renderLastEvent() {
  const lastEventText = document.getElementById("lastEventText");

  if (!lastEventText) return;

  if (appState.events.length === 0) {
    lastEventText.textContent = "Nenhum lance registrado.";
    return;
  }

  const event = appState.events[0];

  if (event.type === "system") {
    lastEventText.textContent = `${event.minute} — ${event.action}: ${event.description}`;
    return;
  }

  lastEventText.textContent = `${event.minute} — ${event.playerName} — ${event.action}`;
}

function renderHistory() {
  const historyList = document.getElementById("historyList");

  if (!historyList) return;

  renderLastEvent();

  if (appState.events.length === 0) {
    historyList.innerHTML = `
      <div class="status-card">
        Nenhum lance registrado ainda.
      </div>
    `;
    return;
  }

  historyList.innerHTML = appState.events
    .map((event) => {
      if (event.type === "system") {
        return `
          <article class="history-row">
            <div class="event-time">${event.minute}</div>
            <div>
              <strong>${escapeHTML(event.action)}</strong>
              <small>${escapeHTML(event.description || "")} — ${escapeHTML(event.period)}</small>
            </div>
          </article>
        `;
      }

      return `
        <article class="history-row">
          <div class="event-time">${event.minute}</div>
          <div>
            <strong>${escapeHTML(event.playerName)} — ${escapeHTML(event.action)}</strong>
            <small>${escapeHTML(event.period)} — Placar ${escapeHTML(event.score)}</small>
          </div>
        </article>
      `;
    })
    .join("");
}

/* =========================================================
   RESUMO / ESTATÍSTICAS
========================================================= */

function renderStats() {
  const statsGrid = document.getElementById("statsGrid");

  if (!statsGrid) return;

  const stats = calculateStats();

  const cards = [
    { label: "Finalizações", value: stats.finalizacoes },
    { label: "Chutes no gol", value: stats.chutesNoGol },
    { label: "Gols UP", value: appState.match.homeScore },
    { label: "Gols sofridos", value: appState.match.awayScore },
    { label: "Passes-chave", value: stats.passesChave },
    { label: "Assistências", value: stats.assistencias },
    { label: "Desarmes", value: stats.desarmes },
    { label: "Interceptações", value: stats.interceptacoes },
    { label: "Faltas", value: stats.faltas },
    { label: "Erros defensivos", value: stats.errosDefensivos },
    { label: "Lesões", value: stats.lesoes }
  ];

  statsGrid.innerHTML = cards
    .map((card) => {
      return `
        <article class="stat-card">
          <small>${escapeHTML(card.label)}</small>
          <strong>${card.value}</strong>
        </article>
      `;
    })
    .join("");
}

function calculateStats() {
  const playerEvents = appState.events.filter((event) => event.type === "player");

  return {
    finalizacoes: countActions(playerEvents, ["Gol", "Chute ao gol", "Chute fora", "Chance clara"]),
    chutesNoGol: countActions(playerEvents, ["Gol", "Chute ao gol"]),
    passesChave: countActions(playerEvents, ["Passe-chave"]),
    assistencias: countActions(playerEvents, ["Assistência"]),
    desarmes: countActions(playerEvents, ["Desarme"]),
    interceptacoes: countActions(playerEvents, ["Interceptação"]),
    faltas: countActions(playerEvents, ["Falta cometida"]),
    errosDefensivos: countActions(playerEvents, ["Erro defensivo"]),
    lesoes: countActions(playerEvents, ["Lesão"])
  };
}

function countActions(events, actions) {
  return events.filter((event) => actions.includes(event.action)).length;
}

/* =========================================================
   FUNÇÕES UTILITÁRIAS
========================================================= */

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   DISPONIBILIZAR FUNÇÕES NO HTML
========================================================= */

window.showScreen = showScreen;
window.goHome = goHome;

window.addPlayer = addPlayer;
window.removePlayer = removePlayer;
window.toggleLineupPlayer = toggleLineupPlayer;

window.createMatch = createMatch;

window.addHomeGoal = addHomeGoal;
window.addAwayGoal = addAwayGoal;
window.changePeriod = changePeriod;

window.applyFormation = applyFormation;
window.setMode = setMode;

window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;

window.selectPlayer = selectPlayer;
window.registerEvent = registerEvent;
window.deleteLastEvent = deleteLastEvent;

window.autoSelectStartingLineup = autoSelectStartingLineup;
window.clearStartingLineup = clearStartingLineup;
window.renderLineupControls = renderLineupControls;

window.normalizePlayerPosition = normalizePlayerPosition;
window.getDisplayPlayerPosition = getDisplayPlayerPosition;
window.resetAppData = resetAppData;
