/* =========================================================
   UP COACH — MATCH ARCHIVE
   Arquivamento de partidas finalizadas + exportação TXT.
========================================================= */

const UP_COACH_ARCHIVE_STATE_KEY = "upCoachState_v2";
const UP_COACH_ARCHIVE_AI_KEY = "upCoachAIResumos_v4";
const UP_COACH_ARCHIVED_MATCHES_KEY = "upCoachArchivedMatches_v1";

document.addEventListener("DOMContentLoaded", () => {
  injectArchiveStyles();
  injectMatchArchivePanel();
  renderArchivedMatches();
});

function injectArchiveStyles() {
  if (document.getElementById("matchArchiveStyles")) return;

  const style = document.createElement("style");
  style.id = "matchArchiveStyles";
  style.textContent = `
    .archive-actions {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .archive-list {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .archive-card {
      border-radius: 16px;
      padding: 13px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .archive-card strong {
      display: block;
      color: var(--white);
      font-size: 14px;
      margin-bottom: 4px;
    }

    .archive-card small {
      display: block;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .archive-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }

    .archive-card-actions button {
      min-height: 38px;
      border-radius: 13px;
      font-size: 12px;
      font-weight: 800;
      color: var(--white);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
    }

    .archive-card-actions button:first-child {
      color: #171103;
      background: linear-gradient(180deg, var(--gold-2), var(--gold));
      border: 1px solid rgba(215, 163, 60, 0.75);
    }

    .archive-empty {
      color: var(--muted);
      font-size: 13px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.06);
    }
  `;

  document.head.appendChild(style);
}

function injectMatchArchivePanel() {
  const summaryScreen = document.getElementById("summaryScreen");

  if (!summaryScreen) return;
  if (document.getElementById("matchArchivePanel")) return;

  summaryScreen.insertAdjacentHTML(
    "beforeend",
    `
    <section class="panel" id="matchArchivePanel">
      <h2>Arquivo da Partida</h2>
      <p>Salve a partida atual no histórico permanente do UP Coach e exporte o relatório completo.</p>

      <div class="archive-actions">
        <button class="primary-button" onclick="archiveCurrentMatch()">
          Arquivar partida atual
        </button>

        <button class="secondary-button" onclick="renderArchivedMatches()">
          Atualizar histórico arquivado
        </button>
      </div>

      <div class="archive-list" id="archivedMatchesList">
        <div class="archive-empty">Nenhuma partida arquivada ainda.</div>
      </div>
    </section>
    `
  );
}

function getArchiveAppState() {
  try {
    const raw = localStorage.getItem(UP_COACH_ARCHIVE_STATE_KEY);

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

function getSavedAISummariesForMatch(match) {
  try {
    const saved = JSON.parse(localStorage.getItem(UP_COACH_ARCHIVE_AI_KEY) || "[]");

    const baseKey = [
      match.createdAt || "sem-data",
      match.opponent || "adversario",
      match.place || "sem-local"
    ].join("|");

    return saved.filter((item) => {
      return item.matchKey && item.matchKey.endsWith(baseKey);
    });
  } catch (error) {
    console.error("Erro ao ler resumos IA:", error);
    return [];
  }
}

function calculateArchiveStats(events, match) {
  const playerEvents = Array.isArray(events)
    ? events.filter((event) => event.type === "player")
    : [];

  return {
    finalizacoes: countArchiveActions(playerEvents, ["Gol", "Chute ao gol", "Chute fora", "Chance clara"]),
    chutesNoGol: countArchiveActions(playerEvents, ["Gol", "Chute ao gol"]),
    golsUP: Number(match.homeScore || 0),
    golsSofridos: Number(match.awayScore || 0),
    passesChave: countArchiveActions(playerEvents, ["Passe-chave"]),
    assistencias: countArchiveActions(playerEvents, ["Assistência"]),
    desarmes: countArchiveActions(playerEvents, ["Desarme"]),
    interceptacoes: countArchiveActions(playerEvents, ["Interceptação"]),
    cortes: countArchiveActions(playerEvents, ["Corte"]),
    faltas: countArchiveActions(playerEvents, ["Falta cometida"]),
    errosDefensivos: countArchiveActions(playerEvents, ["Erro defensivo"]),
    cansacos: countArchiveActions(playerEvents, ["Cansado"]),
    lesoes: countArchiveActions(playerEvents, ["Lesão"])
  };
}

function countArchiveActions(events, actions) {
  return events.filter((event) => actions.includes(event.action)).length;
}

function archiveCurrentMatch() {
  const state = getArchiveAppState();
  const match = state.match || {};
  const events = Array.isArray(state.events) ? state.events : [];
  const players = Array.isArray(state.players) ? state.players : [];
  const lineup = state.lineup || {};

  const hasMatchData =
    match.opponent ||
    match.place ||
    events.length > 0 ||
    Number(match.homeScore || 0) > 0 ||
    Number(match.awayScore || 0) > 0;

  if (!hasMatchData) {
    alert("Nenhuma partida com dados suficientes para arquivar.");
    return;
  }

  const opponent = match.opponent || "Adversário não informado";
  const homeScore = Number(match.homeScore || 0);
  const awayScore = Number(match.awayScore || 0);

  const confirmArchive = confirm(
    `Arquivar partida atual?\n\nUnião Paquerê ${homeScore} x ${awayScore} ${opponent}`
  );

  if (!confirmArchive) return;

  const aiSummaries = getSavedAISummariesForMatch(match);

  const archivedMatch = {
    id: `match_${Date.now()}`,
    archivedAt: new Date().toISOString(),
    match: {
      ...match,
      opponent,
      homeScore,
      awayScore
    },
    players,
    lineup,
    events,
    stats: calculateArchiveStats(events, match),
    aiSummaries
  };

  try {
    const saved = JSON.parse(localStorage.getItem(UP_COACH_ARCHIVED_MATCHES_KEY) || "[]");

    const duplicateKey = buildMatchDuplicateKey(archivedMatch);
    const filtered = saved.filter((item) => buildMatchDuplicateKey(item) !== duplicateKey);

    filtered.unshift(archivedMatch);

    localStorage.setItem(UP_COACH_ARCHIVED_MATCHES_KEY, JSON.stringify(filtered));

    alert("Partida arquivada com sucesso.");
    renderArchivedMatches();
  } catch (error) {
    console.error("Erro ao arquivar partida:", error);
    alert("Não foi possível arquivar a partida.");
  }
}

function buildMatchDuplicateKey(item) {
  const match = item.match || {};

  return [
    match.createdAt || "sem-data",
    match.opponent || "adversario",
    match.place || "sem-local",
    match.homeScore || 0,
    match.awayScore || 0
  ].join("|");
}

function getArchivedMatches() {
  try {
    return JSON.parse(localStorage.getItem(UP_COACH_ARCHIVED_MATCHES_KEY) || "[]");
  } catch (error) {
    console.error("Erro ao carregar partidas arquivadas:", error);
    return [];
  }
}

function renderArchivedMatches() {
  const list = document.getElementById("archivedMatchesList");

  if (!list) return;

  const archivedMatches = getArchivedMatches();

  if (archivedMatches.length === 0) {
    list.innerHTML = `<div class="archive-empty">Nenhuma partida arquivada ainda.</div>`;
    return;
  }

  list.innerHTML = archivedMatches
    .map((item) => {
      const match = item.match || {};
      const stats = item.stats || {};
      const opponent = escapeArchiveHTML(match.opponent || "Adversário");
      const place = escapeArchiveHTML(match.place || "Local não informado");
      const type = escapeArchiveHTML(match.type || "Tipo não informado");
      const homeScore = Number(match.homeScore || 0);
      const awayScore = Number(match.awayScore || 0);
      const archivedDate = formatArchiveDate(item.archivedAt);
      const eventCount = Array.isArray(item.events) ? item.events.length : 0;
      const aiCount = Array.isArray(item.aiSummaries) ? item.aiSummaries.length : 0;

      return `
        <div class="archive-card">
          <strong>União Paquerê ${homeScore} x ${awayScore} ${opponent}</strong>
          <small>${type} • ${place}</small>
          <small>Arquivado em: ${archivedDate}</small>
          <small>Lances: ${eventCount} • Finalizações: ${stats.finalizacoes || 0} • IA salva: ${aiCount}</small>

          <div class="archive-card-actions">
            <button onclick="exportArchivedMatchTXT('${item.id}')">Exportar TXT</button>
            <button onclick="deleteArchivedMatch('${item.id}')">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function exportArchivedMatchTXT(matchId) {
  const archivedMatches = getArchivedMatches();
  const item = archivedMatches.find((match) => match.id === matchId);

  if (!item) {
    alert("Partida arquivada não encontrada.");
    return;
  }

  const text = buildArchivedMatchReport(item);
  const filename = buildArchiveFilename(item);

  downloadTextFile(filename, text);
}

function buildArchivedMatchReport(item) {
  const match = item.match || {};
  const stats = item.stats || {};
  const events = Array.isArray(item.events) ? item.events : [];
  const players = Array.isArray(item.players) ? item.players : [];
  const aiSummaries = Array.isArray(item.aiSummaries) ? item.aiSummaries : [];

  const opponent = match.opponent || "Adversário";
  const homeScore = Number(match.homeScore || 0);
  const awayScore = Number(match.awayScore || 0);

  const playersText = players.length
    ? players
        .map((player) => {
          return `${player.number || "-"} - ${player.name || "-"} - ${player.position || "-"}`;
        })
        .join("\n")
    : "Nenhum jogador registrado.";

  const eventsText = events.length
    ? events
        .map((event) => {
          if (event.type === "system") {
            return `${event.minute || "-"} | ${event.period || "-"} | ${event.action || "-"} | ${event.description || "-"} | Placar: ${event.score || "-"}`;
          }

          return `${event.minute || "-"} | ${event.period || "-"} | ${event.playerName || "-"} | ${event.action || "-"} | Placar: ${event.score || "-"}`;
        })
        .join("\n")
    : "Nenhum lance registrado.";

  const aiText = aiSummaries.length
    ? aiSummaries
        .map((summary) => {
          const label = summary.mode === "social" ? "TEXTO PARA POSTAGEM" : "ANÁLISE TÉCNICA";
          return `\n--- ${label} ---\n${summary.resumo || "Sem texto salvo."}`;
        })
        .join("\n")
    : "Nenhum resumo de IA salvo para esta partida.";

  return `
UP COACH — RELATÓRIO DE PARTIDA
UNIÃO PAQUERÊ

PLACAR
União Paquerê ${homeScore} x ${awayScore} ${opponent}

DADOS DA PARTIDA
Adversário: ${opponent}
Local: ${match.place || "Não informado"}
Tipo: ${match.type || "Não informado"}
Período final/atual: ${match.period || "Não informado"}
Arquivado em: ${formatArchiveDate(item.archivedAt)}

ESTATÍSTICAS
Finalizações: ${stats.finalizacoes || 0}
Chutes no gol: ${stats.chutesNoGol || 0}
Gols UP: ${stats.golsUP || homeScore}
Gols sofridos: ${stats.golsSofridos || awayScore}
Passes-chave: ${stats.passesChave || 0}
Assistências: ${stats.assistencias || 0}
Desarmes: ${stats.desarmes || 0}
Interceptações: ${stats.interceptacoes || 0}
Cortes: ${stats.cortes || 0}
Faltas cometidas: ${stats.faltas || 0}
Erros defensivos: ${stats.errosDefensivos || 0}
Cansaços registrados: ${stats.cansacos || 0}
Lesões: ${stats.lesoes || 0}

ELENCO REGISTRADO
${playersText}

HISTÓRICO DE LANCES
${eventsText}

RESUMOS COM IA
${aiText}

Gerado pelo UP Coach — Banco de Campo Inteligente.
`.trim();
}

function buildArchiveFilename(item) {
  const match = item.match || {};
  const opponent = sanitizeArchiveFilename(match.opponent || "adversario");
  const date = new Date(item.archivedAt || Date.now()).toISOString().slice(0, 10);

  return `up-coach-${date}-uniao-paquerê-x-${opponent}.txt`;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function deleteArchivedMatch(matchId) {
  const confirmDelete = confirm("Excluir esta partida arquivada?");

  if (!confirmDelete) return;

  try {
    const archivedMatches = getArchivedMatches();
    const filtered = archivedMatches.filter((item) => item.id !== matchId);

    localStorage.setItem(UP_COACH_ARCHIVED_MATCHES_KEY, JSON.stringify(filtered));

    renderArchivedMatches();
  } catch (error) {
    console.error("Erro ao excluir partida:", error);
    alert("Não foi possível excluir a partida.");
  }
}

function formatArchiveDate(value) {
  if (!value) return "Data não informada";

  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch (error) {
    return value;
  }
}

function sanitizeArchiveFilename(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeArchiveHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.archiveCurrentMatch = archiveCurrentMatch;
window.renderArchivedMatches = renderArchivedMatches;
window.exportArchivedMatchTXT = exportArchivedMatchTXT;
window.deleteArchivedMatch = deleteArchivedMatch;