const defaultPairs = [
  "AUDCAD", "AUDCHF", "AUDJPY", "AUDNZD", "AUDUSD",
  "CADCHF", "CADJPY", "CHFJPY", "EURAUD", "EURCAD",
  "EURCHF", "EURGBP", "EURJPY", "EURNZD", "EURUSD",
  "GBPAUD", "GBPCAD", "GBPCHF", "GBPJPY", "GBPNZD",
  "GBPUSD", "NZDCAD", "NZDCHF", "NZDJPY", "NZDUSD",
  "US100", "USDCAD", "USDJPY", "XAUUSD", "USDCHF"
];

let scriptUrl = localStorage.getItem('trading_script_url') || '';
let localTrades = JSON.parse(localStorage.getItem('trading_local_history')) || [];
let pairsList = JSON.parse(localStorage.getItem('trading_custom_pairs')) || defaultPairs;
let editingTradeId = null;
let selectModeActive = false;
let selectedTrades = [];

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderPairsSelect();
  autoFillDateTime();
  loadSettings();
  calculateStats();
  renderDashboardAndOperaciones();
});

function showCustomConfirm(title, message, onAccept) {
  const modal = document.getElementById('modal-confirm');
  document.getElementById('confirm-title').innerText = title;
  document.getElementById('confirm-message').innerText = message;
  modal.classList.remove('hidden');

  const acceptBtn = document.getElementById('btn-confirm-accept');
  const cancelBtn = document.getElementById('btn-confirm-cancel');
  const closeConfirm = () => modal.classList.add('hidden');

  acceptBtn.onclick = () => {
    onAccept();
    closeConfirm();
  };

  cancelBtn.onclick = closeConfirm;
}

function renderPairsSelect(selectedPair = null) {
  const selectEl = document.getElementById('form-par');
  pairsList.sort();
  selectEl.innerHTML = pairsList.map(pair => {
    const isSelected = selectedPair === pair ? 'selected' : '';
    return `<option value="${pair}" ${isSelected}>${pair}</option>`;
  }).join('');
}

function togglePairModal(show) {
  const modal = document.getElementById('modal-add-pair');
  if (show) {
    modal.classList.remove('hidden');
    document.getElementById('new-pair-input').value = '';
    document.getElementById('new-pair-input').focus();
  } else {
    modal.classList.add('hidden');
  }
}

function openNewTradeFlow() {
  editingTradeId = null;
  document.getElementById('modal-title').innerText = "Nueva Operación";
  document.getElementById('btn-submit-text').innerText = "Crear Operación";
  const modalIcon = document.getElementById('modal-icon');
  modalIcon.setAttribute('data-lucide', 'plus-circle');
  resetForm();
  toggleNewTradeModal(true);
}

function toggleNewTradeModal(show) {
  const modal = document.getElementById('modal-new-trade');
  const floatingBtn = document.getElementById('floating-add-btn-container');

  if (show) {
    modal.classList.remove('hidden');
    if (floatingBtn) floatingBtn.classList.add('hidden');
    if (editingTradeId === null) autoFillDateTime();
  } else {
    modal.classList.add('hidden');
    if (floatingBtn) floatingBtn.classList.remove('hidden');
  }

  lucide.createIcons();
}

function addNewPair() {
  const inputVal = document.getElementById('new-pair-input').value.trim().toUpperCase();

  if (!inputVal) {
    showToast('Escribe el nombre del par.', 'error');
    return;
  }

  if (pairsList.includes(inputVal)) {
    showToast('Este par ya existe en la lista.', 'error');
    return;
  }

  pairsList.push(inputVal);
  localStorage.setItem('trading_custom_pairs', JSON.stringify(pairsList));
  renderPairsSelect(inputVal);
  togglePairModal(false);
  showToast(`Par ${inputVal} añadido correctamente.`, 'success');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  const navButtons = ['dashboard', 'operaciones', 'settings'];

  navButtons.forEach(btn => {
    const element = document.getElementById(`nav-${btn}`);
    if (element) {
      if (btn === tabId) {
        element.classList.remove('text-slate-400', 'hover:text-slate-200');
        element.classList.add('text-[#00e699]');
      } else {
        element.classList.remove('text-[#00e699]');
        element.classList.add('text-slate-400', 'hover:text-slate-200');
      }
    }
  });

  if (tabId !== 'operaciones' && selectModeActive) {
    toggleSelectMode(false);
  }
}

function autoFillDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  document.getElementById('form-fecha').value = `${year}-${month}-${day}`;

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('form-hora').value = `${hours}:${minutes}`;

  calculateSession();
}

function calculateSession() {
  const horaVal = document.getElementById('form-hora').value;
  if (!horaVal) return;

  const [hour] = horaVal.split(':').map(Number);
  const selectHorario = document.getElementById('form-horario');

  if (hour >= 7 && hour < 15) {
    selectHorario.value = 'NUEVA YORK';
  } else if (hour >= 2 && hour < 11) {
    selectHorario.value = 'LONDRES';
  } else {
    selectHorario.value = 'ASIA';
  }
}

function calculateRatio() {
  const sl = parseFloat(document.getElementById('form-sl').value) || 0;
  const tp = parseFloat(document.getElementById('form-tp').value) || 0;
  const ratioField = document.getElementById('form-ratio');

  if (sl > 0 && tp > 0) {
    ratioField.value = (tp / sl).toFixed(2);
  } else {
    ratioField.value = '0.00';
  }
}

function calculateRMetrics() {
  const resultado = document.getElementById('form-resultado').value;
  const rNeg = document.getElementById('form-r-negativo');
  const rPos = document.getElementById('form-r-positivo');
  const pct = document.getElementById('form-porcentaje');

  if (resultado === 'POSITIVO') {
    rNeg.value = '0';
    rPos.value = '3';
    pct.value = '3';
  } else if (resultado === 'NEGATIVO') {
    rNeg.value = '1';
    rPos.value = '0';
    pct.value = '-1';
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  let bgClass = 'bg-[#121c26] border-slate-800 text-slate-100';
  let icon = 'info';

  if (type === 'success') {
    bgClass = 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100';
    icon = 'check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-rose-950/95 border-rose-500/30 text-rose-100';
    icon = 'alert-triangle';
  }

  toast.className = `p-3.5 rounded-xl border ${bgClass} shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-bounce pointer-events-auto`;
  toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i><span class="flex-1">${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-all', 'duration-500');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function loadSettings() {
  const savedUrl = localStorage.getItem('trading_script_url');
  if (savedUrl) {
    document.getElementById('sheet-api-url').value = savedUrl;
    scriptUrl = savedUrl;
  }
}

function saveApiUrl() {
  const urlVal = document.getElementById('sheet-api-url').value.trim();
  if (!urlVal) {
    showToast('Introduce una URL válida', 'error');
    return;
  }

  localStorage.setItem('trading_script_url', urlVal);
  scriptUrl = urlVal;
  loadSettings();
  showToast('Conexión guardada con éxito', 'success');
}

function copyAppsScriptCode() {
  const codeText = document.getElementById('apps-script-code').innerText;
  const dummy = document.createElement("textarea");
  document.body.appendChild(dummy);
  dummy.value = codeText;
  dummy.select();
  document.execCommand("copy");
  document.body.removeChild(dummy);
  showToast('Código copiado al portapapeles', 'success');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('btn-submit');
  let finalEstado = 'PENDIENTE';

  if (editingTradeId !== null) {
    const existing = localTrades.find(t => t.id === editingTradeId);
    if (existing) finalEstado = existing.estado;
  }

  const tradeData = {
    id: editingTradeId ? editingTradeId : Date.now().toString(),
    par: document.getElementById('form-par').value,
    fecha: document.getElementById('form-fecha').value,
    hora: document.getElementById('form-hora').value,
    tipo: document.getElementById('form-tipo').value,
    gatillo: document.getElementById('form-gatillo').value,
    pipsSl: parseFloat(document.getElementById('form-sl').value) || 0,
    pipsTp: parseFloat(document.getElementById('form-tp').value) || 0,
    ratio: parseFloat(document.getElementById('form-ratio').value) || 0,
    maxRatio: parseFloat(document.getElementById('form-max-ratio').value) || 0,
    resultado: document.getElementById('form-resultado').value,
    duracion: document.getElementById('form-duracion').value || "N/A",
    diario: document.getElementById('form-diario').value || "N/A",
    horario: document.getElementById('form-horario').value,
    cumple: document.getElementById('form-cumple').value || "SÍ",
    observaciones: document.getElementById('form-observaciones').value || "Sin notas.",
    porcentaje: parseFloat(document.getElementById('form-porcentaje').value) || 0,
    rNegativo: parseFloat(document.getElementById('form-r-negativo').value) || 0,
    rPositivo: parseFloat(document.getElementById('form-r-positivo').value) || 0,
    estado: finalEstado
  };

  let isSyncRequired = false;

  if (editingTradeId !== null) {
    const index = localTrades.findIndex(t => t.id === editingTradeId);
    if (index !== -1) {
      const previousStatus = localTrades[index].estado;
      if (previousStatus !== 'COMPLETADO' && tradeData.estado === 'COMPLETADO') {
        isSyncRequired = true;
      }
      localTrades[index] = tradeData;
      showToast('Operación actualizada con éxito', 'success');
    }
  } else {
    localTrades.unshift(tradeData);
    if (tradeData.estado === 'COMPLETADO') isSyncRequired = true;
    showToast('Operación creada con éxito', 'success');
  }

  localStorage.setItem('trading_local_history', JSON.stringify(localTrades));
  toggleNewTradeModal(false);

  if (isSyncRequired && scriptUrl) {
    btn.disabled = true;
    showToast('Sincronizando completada con Google Sheets...', 'info');

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });
      showToast('¡Operación subida a Google Sheets!', 'success');
    } catch (error) {
      console.error("Error sincronizando:", error);
      showToast('Error de red al subir a Google Sheets.', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  editingTradeId = null;
  calculateStats();
  renderDashboardAndOperaciones();
}

function openEditTradeFlow(id) {
  const trade = localTrades.find(t => t.id === id);
  if (!trade) return;

  editingTradeId = id;
  document.getElementById('modal-title').innerText = "Editar Operación";
  document.getElementById('btn-submit-text').innerText = "Guardar Cambios";
  const modalIcon = document.getElementById('modal-icon');
  modalIcon.setAttribute('data-lucide', 'edit-2');

  document.getElementById('form-par').value = trade.par;
  document.getElementById('form-tipo').value = trade.tipo;
  document.getElementById('form-fecha').value = trade.fecha;
  document.getElementById('form-hora').value = trade.hora;
  document.getElementById('form-horario').value = trade.horario;
  document.getElementById('form-gatillo').value = trade.gatillo;
  document.getElementById('form-cumple').value = trade.cumple;
  document.getElementById('form-sl').value = trade.pipsSl || '';
  document.getElementById('form-tp').value = trade.pipsTp || '';
  document.getElementById('form-ratio').value = trade.ratio || '0.00';
  document.getElementById('form-max-ratio').value = trade.maxRatio || '';
  document.getElementById('form-resultado').value = trade.resultado;
  document.getElementById('form-porcentaje').value = trade.porcentaje || '';
  document.getElementById('form-r-negativo').value = trade.rNegativo || '0';
  document.getElementById('form-r-positivo').value = trade.rPositivo || '0';
  document.getElementById('form-duracion').value = trade.duracion !== "N/A" ? trade.duracion : '';
  document.getElementById('form-diario').value = trade.diario !== "N/A" ? trade.diario : '';
  document.getElementById('form-observaciones').value = trade.observaciones !== "Sin notas." ? trade.observaciones : '';

  toggleNewTradeModal(true);
}

async function updateTradeStatus(id, newStatus) {
  const index = localTrades.findIndex(trade => trade.id === id);
  if (index === -1) return;

  localTrades[index].estado = newStatus;

  if (newStatus === 'COMPLETADO') {
    const completedTrade = localTrades[index];
    showToast('Operación completada. Sincronizando con Google Sheet...', 'success');

    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completedTrade)
        });
        showToast('¡Operación subida exitosamente a Google Sheets!', 'success');
      } catch (error) {
        console.error("Error sincronizando:", error);
        showToast('Guardado localmente. Error al enviar a Sheets.', 'error');
      }
    } else {
      showToast('Operación archivada. Conecta tu Google Sheet para subirla.', 'info');
    }
  } else {
    showToast(`Operación marcada como ${newStatus}`, 'info');
  }

  localStorage.setItem('trading_local_history', JSON.stringify(localTrades));
  calculateStats();
  renderDashboardAndOperaciones();
}

function toggleSelectMode(forceState = null) {
  selectModeActive = forceState !== null ? forceState : !selectModeActive;
  selectedTrades = [];

  const selectBtn = document.getElementById('btn-select-mode');
  const deleteBtn = document.getElementById('btn-delete-completed');

  if (selectModeActive) {
    selectBtn.className = "text-xs text-slate-400 flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all font-semibold";
    selectBtn.innerHTML = `<i data-lucide="x" class="w-3.5 h-3.5"></i> Cancelar`;
    deleteBtn.className = "text-xs text-rose-400 flex items-center gap-1 bg-rose-500/15 px-2.5 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/20 transition-all font-bold";
    deleteBtn.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Eliminar (0)`;
  } else {
    selectBtn.className = "text-xs text-[#00e699] flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1.5 rounded-xl border border-emerald-500/10 hover:bg-emerald-500/10 transition-all font-semibold";
    selectBtn.innerHTML = `<i data-lucide="check-square" class="w-3.5 h-3.5"></i> Seleccionar`;
    deleteBtn.className = "text-xs text-rose-400 flex items-center gap-1 bg-rose-500/5 px-2.5 py-1.5 rounded-xl border border-rose-500/10 hover:bg-rose-500/10 transition-all font-semibold";
    deleteBtn.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Borrar Todo`;
  }

  lucide.createIcons();
  renderDashboardAndOperaciones();
}

function toggleSelectTrade(id) {
  if (!selectModeActive) return;

  const index = selectedTrades.indexOf(id);
  if (index > -1) selectedTrades.splice(index, 1);
  else selectedTrades.push(id);

  const deleteBtn = document.getElementById('btn-delete-completed');
  deleteBtn.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Eliminar (${selectedTrades.length})`;

  lucide.createIcons();

  const checkbox = document.getElementById(`chk-${id}`);
  if (checkbox) checkbox.checked = selectedTrades.includes(id);
}

function handleClearOrDeleteAction() {
  if (selectModeActive) {
    if (selectedTrades.length === 0) {
      showToast('No has seleccionado ninguna operación para borrar.', 'error');
      return;
    }

    showCustomConfirm(
      '¿Eliminar seleccionados?',
      `Vas a borrar definitivamente ${selectedTrades.length} operaciones del historial local.`,
      () => {
        localTrades = localTrades.filter(trade => !selectedTrades.includes(trade.id));
        localStorage.setItem('trading_local_history', JSON.stringify(localTrades));
        showToast(`Se han eliminado ${selectedTrades.length} operaciones.`, 'success');
        toggleSelectMode(false);
        calculateStats();
        renderDashboardAndOperaciones();
      }
    );
  } else {
    const completedTrades = localTrades.filter(t => t.estado === 'COMPLETADO');
    if (completedTrades.length === 0) {
      showToast('No hay operaciones guardadas en el historial.', 'error');
      return;
    }

    showCustomConfirm(
      '¿Borrar todo el historial?',
      'Esto eliminará todas las operaciones completadas de la memoria local.',
      () => {
        localTrades = localTrades.filter(t => t.estado !== 'COMPLETADO');
        localStorage.setItem('trading_local_history', JSON.stringify(localTrades));
        calculateStats();
        renderDashboardAndOperaciones();
        showToast('Historial completo eliminado.', 'success');
      }
    );
  }
}

function deleteSingleTrade(id) {
  const trade = localTrades.find(t => t.id === id);
  if (!trade) return;

  showCustomConfirm(
    '¿Eliminar operación?',
    `¿Deseas eliminar la operación de ${trade.par}?`,
    () => {
      localTrades = localTrades.filter(t => t.id !== id);
      localStorage.setItem('trading_local_history', JSON.stringify(localTrades));
      showToast('Operación eliminada', 'success');
      calculateStats();
      renderDashboardAndOperaciones();
    }
  );
}

function calculateStats() {
  const completedTrades = localTrades.filter(t => t.estado === 'COMPLETADO');
  const total = completedTrades.length;
  const won = completedTrades.filter(t => t.resultado === 'POSITIVO').length;
  const lost = completedTrades.filter(t => t.resultado === 'NEGATIVO').length;

  document.getElementById('stat-total').innerText = total;
  document.getElementById('stat-won').innerText = won;
  document.getElementById('stat-lost').innerText = lost;

  const winPct = total > 0 ? Math.round((won / total) * 100) : 0;
  document.getElementById('stat-won-pct').innerText = `${winPct}%`;

  let totalPerformance = 0;
  completedTrades.forEach(t => {
    totalPerformance += parseFloat(t.porcentaje) || 0;
  });
  const sign = totalPerformance >= 0 ? '+' : '';
  document.getElementById('stat-performance').innerText = `${sign} ${totalPerformance.toFixed(2).replace('.', ',')} %`;

  let ratioSum = 0;
  completedTrades.forEach(t => {
    ratioSum += parseFloat(t.ratio) || 0;
  });
  const ratioAvg = total > 0 ? (ratioSum / total).toFixed(2) : '0.00';
  document.getElementById('stat-ratio-avg').innerText = ratioAvg;
}

function resetForm() {
  document.getElementById('trade-form').reset();
  autoFillDateTime();
  document.getElementById('form-ratio').value = '0.00';
  document.getElementById('form-r-negativo').value = '1';
  document.getElementById('form-r-positivo').value = '0';
  document.getElementById('form-porcentaje').value = '-1';
}

function renderDashboardAndOperaciones() {
  const activeListContainer = document.getElementById('active-trades-list');
  const completedListContainer = document.getElementById('completed-trades-list');

  const activeTrades = localTrades.filter(t => t.estado !== 'COMPLETADO');
  const completedTrades = localTrades.filter(t => t.estado === 'COMPLETADO');

  if (activeTrades.length === 0) {
    activeListContainer.innerHTML = `
      <div class="bg-[#121c26]/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <i data-lucide="line-chart" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
        <p class="text-xs">No hay operaciones activas ni pendientes.</p>
        <button onclick="openNewTradeFlow()" class="mt-3 text-xs bg-[#00e699]/10 hover:bg-[#00e699]/20 border border-[#00e699]/20 text-[#00e699] px-3 py-1.5 rounded-xl font-bold transition-all">
          Crear una Operación
        </button>
      </div>
    `;
  } else {
    let activeHtml = '';

    activeTrades.forEach(trade => {
      const isEnCurso = trade.estado === 'EN CURSO';
      const statusBg = isEnCurso ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-amber-500/5 border-amber-500/20';
      const statusText = isEnCurso ? 'text-cyan-400' : 'text-amber-400';
      const pulseIcon = isEnCurso ? '<span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>' : '<span class="w-2 h-2 rounded-full bg-amber-400"></span>';
      const dirColor = trade.tipo === 'BUY' ? 'text-[#00e699] bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10';

      activeHtml += `
        <div class="bg-[#121c26] border ${isEnCurso ? 'border-cyan-500/30' : 'border-slate-850'} rounded-2xl p-4 space-y-3 shadow-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="font-black text-sm text-white">${trade.par}</span>
              <span class="text-[10px] ${dirColor} font-black px-2 py-0.5 rounded">${trade.tipo}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 ${statusBg} text-[9px] font-bold rounded-full border flex items-center gap-1 ${statusText}">
                ${pulseIcon}
                ${trade.estado}
              </span>
              <span class="text-[10px] text-slate-500 font-medium">${trade.fecha}</span>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1 text-center bg-slate-950 p-2 rounded-xl text-xs">
            <div>
              <p class="text-[9px] text-slate-500">Pips SL / TP</p>
              <p class="font-semibold text-slate-300 text-[11px]">${trade.pipsSl || '-'} / ${trade.pipsTp || '-'}</p>
            </div>
            <div>
              <p class="text-[9px] text-slate-500">Ratio TP/SL</p>
              <p class="font-bold text-indigo-400 text-[11px]">${trade.ratio || '0.00'}</p>
            </div>
            <div>
              <p class="text-[9px] text-slate-500">Gatillo</p>
              <p class="font-semibold text-slate-300 text-[11px]">${trade.gatillo}</p>
            </div>
            <div>
              <p class="text-[9px] text-slate-500">Sesión</p>
              <p class="font-semibold text-slate-300 text-[10px]">${trade.horario}</p>
            </div>
          </div>

          <div class="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-850 pt-2.5">
            <div class="flex gap-1.5">
              ${trade.estado === 'PENDIENTE' ? `
                <button onclick="updateTradeStatus('${trade.id}', 'EN CURSO')" class="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-lg border border-cyan-500/20 font-bold active:scale-95 transition-all text-[10px]">
                  Activar Entrada
                </button>
              ` : `
                <button onclick="updateTradeStatus('${trade.id}', 'PENDIENTE')" class="bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20 font-bold active:scale-95 transition-all text-[10px]">
                  Pausar Entrada
                </button>
              `}
              <button onclick="openEditTradeFlow('${trade.id}')" class="bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 active:scale-95 transition-all flex items-center gap-1 text-[10px]">
                <i data-lucide="edit-2" class="w-3 h-3"></i> Editar
              </button>
            </div>
            <button onclick="updateTradeStatus('${trade.id}', 'COMPLETADO')" class="bg-[#00e699] text-slate-950 px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1 active:scale-95 transition-all text-[10px]">
              <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
              Completar
            </button>
          </div>
        </div>
      `;
    });

    activeListContainer.innerHTML = activeHtml;
  }

  if (completedTrades.length === 0) {
    completedListContainer.innerHTML = `
      <div class="bg-[#121c26] border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <i data-lucide="archive" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p class="text-sm">No hay operaciones completadas todavía.</p>
      </div>
    `;
  } else {
    let completedHtml = '';

    completedTrades.forEach(trade => {
      const isPositivo = trade.resultado === 'POSITIVO';
      const isChecked = selectedTrades.includes(trade.id);
      let resultBadge = isPositivo
        ? `<span class="bg-emerald-500/15 border border-emerald-500/20 text-[#00e699] text-[10px] font-bold px-2.5 py-0.5 rounded-full">POSITIVO</span>`
        : `<span class="bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">NEGATIVO</span>`;
      const dirColor = trade.tipo === 'BUY' ? 'text-[#00e699] bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10';

      completedHtml += `
        <div class="flex items-stretch gap-2">
          ${selectModeActive ? `
            <div onclick="toggleSelectTrade('${trade.id}')" class="bg-[#121c26] border border-slate-800 rounded-2xl px-3 flex items-center justify-center active:scale-95 transition-all cursor-pointer">
              <input type="checkbox" id="chk-${trade.id}" ${isChecked ? 'checked' : ''} class="w-4.5 h-4.5 rounded text-[#00e699] bg-[#0b131a] border-slate-800 focus:ring-emerald-500 focus:ring-opacity-25 pointer-events-none">
            </div>
          ` : ''}

          <div onclick="${selectModeActive ? `toggleSelectTrade('${trade.id}')` : ''}" class="bg-[#121c26] border border-slate-800/80 rounded-2xl p-4 space-y-2.5 flex-1 shadow-sm transition-all ${isChecked ? 'border-emerald-500/40 bg-emerald-500/[0.01]' : ''}">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-sm text-white">${trade.par}</span>
                <span class="text-[10px] ${dirColor} font-extrabold px-2 py-0.5 rounded">${trade.tipo}</span>
              </div>
              <div class="flex items-center gap-1.5">
                ${resultBadge}
                <span class="text-[10px] text-slate-500 font-medium">${trade.fecha}</span>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-1 text-center bg-slate-950 p-2 rounded-xl text-xs">
              <div>
                <p class="text-[9px] text-slate-500">TP / SL</p>
                <p class="font-semibold text-slate-300">${trade.pipsTp || '-'} / ${trade.pipsSl || '-'}</p>
              </div>
              <div>
                <p class="text-[9px] text-slate-500">Ratio TP/SL</p>
                <p class="font-semibold text-[#00e699]">${trade.ratio || '0.00'}</p>
              </div>
              <div>
                <p class="text-[9px] text-slate-500">Max Ratio</p>
                <p class="font-semibold text-sky-400">${trade.maxRatio || '-'}</p>
              </div>
              <div>
                <p class="text-[9px] text-slate-500">Porcentaje</p>
                <p class="font-bold ${trade.porcentaje >= 0 ? 'text-[#00e699]' : 'text-rose-400'}">${trade.porcentaje >= 0 ? '+' : ''}${trade.porcentaje}%</p>
              </div>
            </div>

            <div class="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800/60 pt-2">
              <div class="flex items-center gap-2">
                <span>Gatillo: <strong class="text-slate-300">${trade.gatillo}</strong></span>
                <span>R: <strong class="text-slate-300">${trade.rPositivo}R / -${trade.rNegativo}R</strong></span>
              </div>

              ${!selectModeActive ? `
                <div class="flex gap-1">
                  <button onclick="openEditTradeFlow('${trade.id}'); event.stopPropagation();" class="bg-[#0b131a] hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg border border-slate-750 active:scale-95 transition-all flex items-center gap-1 text-[9px]" title="Editar">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>
                  </button>
                  <button onclick="deleteSingleTrade('${trade.id}'); event.stopPropagation();" class="bg-[#0b131a] hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded-lg border border-rose-500/25 active:scale-95 transition-all flex items-center gap-1 text-[9px]" title="Eliminar">
                    <i data-lucide="trash" class="w-3 h-3"></i>
                  </button>
                </div>
              ` : ''}
            </div>

            ${trade.observaciones && trade.observaciones !== 'Sin notas.' ? `
              <p class="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg italic line-clamp-2">
                "${trade.observaciones}"
              </p>
            ` : ''}
          </div>
        </div>
      `;
    });

    completedListContainer.innerHTML = completedHtml;
  }

  lucide.createIcons();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
