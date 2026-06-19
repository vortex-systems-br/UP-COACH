/* =========================================================
   UP COACH — BACKUP MANAGER
   Exportar e restaurar dados completos do app.
========================================================= */

const UP_COACH_BACKUP_KEYS = [
  "upCoachState_v1",
  "upCoachState_v2",
  "upCoachAIResumos_v1",
  "upCoachAIResumos_v2",
  "upCoachAIResumos_v3",
  "upCoachAIResumos_v4",
  "upCoachArchivedMatches_v1"
];

document.addEventListener("DOMContentLoaded", () => {
  injectBackupStyles();
  injectBackupPanel();
  renderBackupStatus();
});

function injectBackupStyles() {
  if (document.getElementById("backupManagerStyles")) return;

  const style = document.createElement("style");
  style.id = "backupManagerStyles";
  style.textContent = `
    .backup-actions {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .backup-actions input[type="file"] {
      display: none;
    }

    .backup-status {
      margin-top: 14px;
      padding: 13px;
      border-radius: 14px;
      background: rgba(255,255,255,0.045);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .backup-status strong {
      color: var(--white);
    }

    .backup-warning {
      color: var(--gold-2);
      font-weight: 800;
    }

    .backup-danger-button {
      width: 100%;
      min-height: 50px;
      border-radius: 15px;
      font-weight: 850;
      color: #fff;
      background: rgba(217, 83, 79, 0.22);
      border: 1px solid rgba(217, 83, 79, 0.50);
      box-shadow: 0 10px 24px rgba(217, 83, 79, 0.10);
    }

    .backup-actions button:active,
    .backup-danger-button:active {
      transform: scale(0.985);
    }
  `;

  document.head.appendChild(style);
}

function injectBackupPanel() {
  const summaryScreen = document.getElementById("summaryScreen");

  if (!summaryScreen) return;
  if (document.getElementById("backupManagerPanel")) return;

  summaryScreen.insertAdjacentHTML(
    "beforeend",
    `
    <section class="panel" id="backupManagerPanel">
      <h2>Backup do UP Coach</h2>
      <p>Exporte todos os dados do app para guardar com segurança ou restaurar em outro dispositivo.</p>

      <div class="backup-actions">
        <button class="primary-button" onclick="exportUPCoachBackup()">
          Exportar backup completo
        </button>

        <button class="secondary-button" onclick="document.getElementById('backupImportInput').click()">
          Restaurar backup
        </button>

        <input
          id="backupImportInput"
          type="file"
          accept="application/json,.json"
          onchange="importUPCoachBackup(event)"
        />

        <button class="secondary-button" onclick="renderBackupStatus()">
          Atualizar status do backup
        </button>

        <button class="backup-danger-button" onclick="clearAllUPCoachData()">
          Apagar todos os dados do UP Coach
        </button>
      </div>

      <div class="backup-status" id="backupStatus">
        Verificando dados salvos...
      </div>
    </section>
    `
  );
}

function getBackupData() {
  const data = {};

  UP_COACH_BACKUP_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);

    if (value !== null) {
      data[key] = value;
    }
  });

  return {
    app: "UP Coach",
    club: "União Paquerê",
    version: "backup-v1",
    exportedAt: new Date().toISOString(),
    keys: UP_COACH_BACKUP_KEYS,
    data
  };
}

function exportUPCoachBackup() {
  const backup = getBackupData();
  const text = JSON.stringify(backup, null, 2);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `up-coach-backup-${date}.json`;

  downloadBackupFile(filename, text);

  renderBackupStatus();
}

function downloadBackupFile(filename, text) {
  const blob = new Blob([text], {
    type: "application/json;charset=utf-8"
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

function importUPCoachBackup(event) {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  const confirmImport = confirm(
    "Restaurar backup do UP Coach?\n\n" +
    "Isso pode substituir dados atuais do app, incluindo partida atual, histórico, resumos de IA e partidas arquivadas."
  );

  if (!confirmImport) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));

      if (!isValidUPCoachBackup(parsed)) {
        alert("Arquivo inválido. Este não parece ser um backup do UP Coach.");
        event.target.value = "";
        return;
      }

      Object.entries(parsed.data || {}).forEach(([key, value]) => {
        if (UP_COACH_BACKUP_KEYS.includes(key)) {
          localStorage.setItem(key, value);
        }
      });

      alert("Backup restaurado com sucesso. O app será recarregado.");

      window.location.reload();
    } catch (error) {
      console.error("Erro ao importar backup:", error);
      alert("Não foi possível restaurar o backup. Verifique se o arquivo é JSON válido.");
    } finally {
      event.target.value = "";
    }
  };

  reader.onerror = () => {
    alert("Erro ao ler o arquivo de backup.");
    event.target.value = "";
  };

  reader.readAsText(file, "utf-8");
}

function isValidUPCoachBackup(value) {
  if (!value || typeof value !== "object") return false;
  if (value.app !== "UP Coach") return false;
  if (!value.data || typeof value.data !== "object") return false;

  return true;
}

function clearAllUPCoachData() {
  const confirmFirst = confirm(
    "Atenção: isso vai apagar TODOS os dados do UP Coach neste navegador.\n\n" +
    "Elenco, partida atual, histórico, resumos IA, arquivos e backups locais serão removidos.\n\n" +
    "Deseja continuar?"
  );

  if (!confirmFirst) return;

  const confirmSecond = confirm(
    "Confirma apagar tudo?\n\n" +
    "Antes de continuar, é recomendado exportar um backup."
  );

  if (!confirmSecond) return;

  UP_COACH_BACKUP_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  alert("Todos os dados do UP Coach foram apagados. O app será recarregado.");

  window.location.reload();
}

function renderBackupStatus() {
  const status = document.getElementById("backupStatus");

  if (!status) return;

  const state = safeParseLocalStorage("upCoachState_v2", {});
  const archived = safeParseLocalStorage("upCoachArchivedMatches_v1", []);
  const aiV4 = safeParseLocalStorage("upCoachAIResumos_v4", []);

  const players = Array.isArray(state.players) ? state.players.length : 0;
  const events = Array.isArray(state.events) ? state.events.length : 0;
  const archivedCount = Array.isArray(archived) ? archived.length : 0;
  const aiCount = Array.isArray(aiV4) ? aiV4.length : 0;

  const match = state.match || {};
  const hasCurrentMatch =
    match.active ||
    match.opponent ||
    Number(match.homeScore || 0) > 0 ||
    Number(match.awayScore || 0) > 0 ||
    events > 0;

  status.innerHTML = `
    <strong>Status dos dados:</strong><br>
    Elenco salvo: ${players} jogador(es)<br>
    Partida atual: ${
      hasCurrentMatch
        ? `<span class="backup-warning">há dados de partida em andamento.</span>`
        : `nenhuma partida em andamento.`
    }<br>
    Lances atuais: ${events}<br>
    Partidas arquivadas: ${archivedCount}<br>
    Resumos IA salvos: ${aiCount}
  `;
}

function safeParseLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

window.exportUPCoachBackup = exportUPCoachBackup;
window.importUPCoachBackup = importUPCoachBackup;
window.clearAllUPCoachData = clearAllUPCoachData;
window.renderBackupStatus = renderBackupStatus;