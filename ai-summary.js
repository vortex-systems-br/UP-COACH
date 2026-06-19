/* =========================================================
   UP COACH — AI SUMMARY
   Resumo de partida com Gemini via Worker seguro.
========================================================= */

const UP_COACH_AI_WORKER_URL = "https://up-coach-ai.denisovercros3577.workers.dev/";
const UP_COACH_STATE_KEY = "upCoachState_v2";
const UP_COACH_AI_STORAGE_KEY = "upCoachAIResumos_v4";

let currentAISummaryMode = "tecnico";

document.addEventListener("DOMContentLoaded", () => {
  injectAISummaryPanel();
  loadCurrentSavedSummary("tecnico");
});

function injectAISummaryPanel() {
  const summaryScreen = document.getElementById("summaryScreen");

  if (!summaryScreen) return;
  if (document.getElementById("aiSummaryPanel")) return;

  summaryScreen.insertAdjacentHTML(
    "beforeend",
    `
    <section class="panel" id="aiSummaryPanel">
      <h2>Resumo com IA</h2>
      <p>Gere análise técnica ou texto para postagem com base nos dados registrados no UP Coach.</p>

      <div class="ai-summary-actions">
        <button class="primary-button" id="generateTechnicalSummaryButton" onclick="generateAISummary('tecnico')">
          Gerar análise técnica
        </button>

        <button class="secondary-button" id="generateSocialSummaryButton" onclick="generateAISummary('social')">
          Gerar texto para postagem
        </button>
      </div>

      <button class="secondary-button" onclick="copyAISummary()">
        Copiar texto exibido
      </button>

      <div
        id="aiSummaryOutput"
        style="
          margin-top: 14px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--white);
          white-space: pre-wrap;
          line-height: 1.5;
          font-size: 13px;
          min-height: 90px;
        "
      >
        Nenhum resumo gerado ainda.
      </div>
    </section>
    `
  );
}

async function generateAISummary(mode = "tecnico") {
  currentAISummaryMode = mode;

  const output = document.getElementById("aiSummaryOutput");
  const technicalButton = document.getElementById("generateTechnicalSummaryButton");
  const socialButton = document.getElementById("generateSocialSummaryButton");

  if (!output || !technicalButton || !socialButton) return;

  if (!UP_COACH_AI_WORKER_URL) {
    output.textContent = "Worker da IA ainda não configurado.";
    return;
  }

  const payload = buildAIPayload(mode);

  if (!payload.match.active) {
    const confirmGenerate = confirm(
      "Nenhuma partida ativa foi encontrada. Deseja tentar gerar mesmo assim?"
    );

    if (!confirmGenerate) return;
  }

  technicalButton.disabled = true;
  socialButton.disabled = true;

  if (mode === "tecnico") {
    technicalButton.textContent = "Gerando análise...";
    output.textContent = "Analisando dados técnicos da partida...";
  } else {
    socialButton.textContent = "Gerando postagem...";
    output.textContent = "Criando texto para WhatsApp/Instagram...";
  }

  try {
    const response = await fetch(UP_COACH_AI_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Resposta inválida do Worker.");
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Erro ao gerar conteúdo com IA.");
    }

    const resumo = data.resumo || "A IA não retornou texto.";

    output.textContent = resumo;

    saveAISummary({
      mode,
      resumo,
      geradoEm: data.geradoEm || new Date().toISOString(),
      match: payload.match,
      stats: payload.stats
    });
  } catch (error) {
    output.textContent =
      "Não foi possível gerar o conteúdo com IA.\n\n" +
      "Verifique se o Worker está online, se a API Key está configurada e se há internet.\n\n" +
      "Erro: " +
      String(error.message || error);
  } finally {
    technicalButton.disabled = false;
    socialButton.disabled = false;
    technicalButton.textContent = "Gerar análise técnica";
    socialButton.textContent = "Gerar texto para postagem";
  }
}

function buildAIPayload(mode) {
  const state = getAppState();

  const events = Array.isArray(state.events) ? state.events : [];
  const players = Array.isArray(state.players) ? state.players : [];
  const match = state.match || {};
  const lineup = state.lineup || {};

  return {
    summaryMode: mode,
    match,
    lineup,
    players,
    events,
    stats: calculateAIStats(events, match),
    generatedFrom: "UP Coach PWA"
  };
}

function getAppState() {
  try {
    const raw = localStorage.getItem(UP_COACH_STATE_KEY);

    if (!raw) {
      return {
        match: {},
        lineup: {},
        players: [],
        events: []
      };
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Erro ao ler dados do UP Coach:", error);

    return {
      match: {},
      lineup: {},
      players: [],
      events: []
    };
  }
}

function calculateAIStats(events, match) {
  const playerEvents = events.filter((event) => event.type === "player");

  return {
    finalizacoes: countActions(playerEvents, ["Gol", "Chute ao gol", "Chute fora", "Chance clara"]),
    chutesNoGol: countActions(playerEvents, ["Gol", "Chute ao gol"]),
    golsUP: Number(match.homeScore || 0),
    golsSofridos: Number(match.awayScore || 0),
    passesChave: countActions(playerEvents, ["Passe-chave"]),
    assistencias: countActions(playerEvents, ["Assistência"]),
    desarmes: countActions(playerEvents, ["Desarme"]),
    interceptacoes: countActions(playerEvents, ["Interceptação"]),
    cortes: countActions(playerEvents, ["Corte"]),
    faltas: countActions(playerEvents, ["Falta cometida"]),
    errosDefensivos: countActions(playerEvents, ["Erro defensivo"]),
    cansacos: countActions(playerEvents, ["Cansado"]),
    lesoes: countActions(playerEvents, ["Lesão"])
  };
}

function countActions(events, actions) {
  return events.filter((event) => actions.includes(event.action)).length;
}

function getCurrentMatchKey(match, mode) {
  return [
    mode || "tecnico",
    match.createdAt || "sem-data",
    match.opponent || "adversario",
    match.place || "sem-local"
  ].join("|");
}

function saveAISummary(summaryData) {
  try {
    const saved = JSON.parse(localStorage.getItem(UP_COACH_AI_STORAGE_KEY) || "[]");
    const matchKey = getCurrentMatchKey(summaryData.match || {}, summaryData.mode);

    const newSummary = {
      id: `ai_${Date.now()}`,
      matchKey,
      ...summaryData
    };

    const filtered = saved.filter((item) => item.matchKey !== matchKey);
    filtered.unshift(newSummary);

    localStorage.setItem(UP_COACH_AI_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Erro ao salvar resumo IA:", error);
  }
}

function loadCurrentSavedSummary(mode = "tecnico") {
  const output = document.getElementById("aiSummaryOutput");

  if (!output) return;

  try {
    const state = getAppState();
    const matchKey = getCurrentMatchKey(state.match || {}, mode);
    const saved = JSON.parse(localStorage.getItem(UP_COACH_AI_STORAGE_KEY) || "[]");

    const current = saved.find((item) => item.matchKey === matchKey);

    if (current && current.resumo) {
      output.textContent = current.resumo;
    }
  } catch (error) {
    console.error("Erro ao carregar resumo IA salvo:", error);
  }
}

async function copyAISummary() {
  const output = document.getElementById("aiSummaryOutput");

  if (!output) return;

  const text = output.textContent.trim();

  if (!text || text === "Nenhum resumo gerado ainda.") {
    alert("Nenhum texto para copiar ainda.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert("Texto copiado.");
  } catch (error) {
    alert("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
  }
}

window.generateAISummary = generateAISummary;
window.copyAISummary = copyAISummary;