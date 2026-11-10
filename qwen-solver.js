/**
 * Qwen Solver Injector Module
 * Автономный модуль для решения заданий с помощью локальной модели Qwen (Ollama / LM Studio)
 */
(function() {
  // Конфигурация по умолчанию
  const config = {
    endpoint: 'http://localhost:11434/api/generate', // Локальный сервер Ollama
    model: 'qwen2.5:7b',                             // Используемая модель
    enabled: true
  };

  let isConnected = false;

  // Создаем и внедряем стили и интерфейс
  function initModule() {
    if (document.getElementById('qwen-solver-root')) return;

    // Стили изолированы внутри виджета
    const style = document.createElement('style');
    style.innerHTML = `
      #qwen-solver-root {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
      }
      #qwen-solver-root * {
        box-sizing: border-box;
      }
      .qwen-widget-btn {
        background: #6366f1;
        color: white;
        border: 2px solid #818cf8;
        padding: 12px 20px;
        border-radius: 30px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
      }
      .qwen-widget-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(99, 102, 241, 0.7);
      }
      .qwen-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ef4444;
      }
      .qwen-status-dot.active {
        background: #10b981;
        box-shadow: 0 0 10px #10b981;
      }
      .qwen-panel {
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 380px;
        background: #1e1f2e;
        border: 1px solid #2d2f45;
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        display: none;
        flex-direction: column;
        gap: 12px;
        color: #f3f4f6;
      }
      .qwen-panel.visible {
        display: flex;
      }
      .qwen-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #2d2f45;
        padding-bottom: 10px;
      }
      .qwen-panel-title {
        font-weight: 700;
        font-size: 15px;
        color: #fff;
      }
      .qwen-panel-close {
        background: transparent;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 18px;
      }
      .qwen-input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .qwen-input-group label {
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        font-weight: 600;
      }
      .qwen-input {
        background: #12131c;
        border: 1px solid #2d2f45;
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        outline: none;
      }
      .qwen-result-area {
        background: #12131c;
        border: 1px solid #2d2f45;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        color: #e5e7eb;
      }
      .qwen-action-btn {
        background: #10b981;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .qwen-action-btn:hover {
        background: #059669;
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'qwen-solver-root';
    root.innerHTML = `
      <div class="qwen-panel" id="qwen-panel">
        <div class="qwen-panel-header">
          <span class="qwen-panel-title">🤖 Qwen Solver</span>
          <button class="qwen-panel-close" id="qwen-close-btn">✕</button>
        </div>
        
        <div class="qwen-input-group">
          <label>Endpoint (Ollama / LM Studio)</label>
          <input type="text" class="qwen-input" id="qwen-endpoint-input" value="${config.endpoint}">
        </div>

        <div class="qwen-input-group">
          <label>Модель Qwen</label>
          <input type="text" class="qwen-input" id="qwen-model-input" value="${config.model}">
        </div>

        <button class="qwen-action-btn" id="qwen-solve-selection-btn">⚡ Решить выделенный текст</button>

        <div class="qwen-input-group">
          <label>Ответ нейросети</label>
          <div class="qwen-result-area" id="qwen-result-output">Готов к работе. Выделите задачу на странице и нажмите кнопку выше.</div>
        </div>
      </div>

      <button class="qwen-widget-btn" id="qwen-toggle-btn">
        <span class="qwen-status-dot" id="qwen-status-dot"></span>
        <span id="qwen-btn-text">Qwen Solver: ON</span>
      </button>
    `;
    document.body.appendChild(root);

    // События интерфейса
    const toggleBtn = document.getElementById('qwen-toggle-btn');
    const closeBtn = document.getElementById('qwen-close-btn');
    const panel = document.getElementById('qwen-panel');
    const statusDot = document.getElementById('qwen-status-dot');
    const solveSelectionBtn = document.getElementById('qwen-solve-selection-btn');
    const endpointInput = document.getElementById('qwen-endpoint-input');
    const modelInput = document.getElementById('qwen-model-input');

    checkConnection();

    toggleBtn.addEventListener('click', () => {
      config.enabled = !config.enabled;
      if (config.enabled) {
        panel.classList.toggle('visible');
        document.getElementById('qwen-btn-text').textContent = 'Qwen Solver: ON';
        statusDot.style.background = isConnected ? '#10b981' : '#ef4444';
      } else {
        panel.classList.remove('visible');
        document.getElementById('qwen-btn-text').textContent = 'Qwen Solver: OFF';
        statusDot.style.background = '#6b7280';
      }
    });

    closeBtn.addEventListener('click', () => panel.classList.remove('visible'));

    endpointInput.addEventListener('change', (e) => {
      config.endpoint = e.target.value;
      checkConnection();
    });

    modelInput.addEventListener('change', (e) => {
      config.model = e.target.value;
    });

    solveSelectionBtn.addEventListener('click', () => {
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) {
        updateOutput('⚠️ Сначала выделите текст задачи мышкой на странице!');
        return;
      }
      solveTask(selectedText);
    });
  }

  async function checkConnection() {
    const statusDot = document.getElementById('qwen-status-dot');
    try {
      const res = await fetch(config.endpoint.replace('/generate', '/tags'), { method: 'GET' });
      if (res.ok || res.status === 404) {
        isConnected = true;
        if (statusDot && config.enabled) statusDot.className = 'qwen-status-dot active';
      } else {
        throw new Error();
      }
    } catch (e) {
      isConnected = false;
      if (statusDot && config.enabled) statusDot.className = 'qwen-status-dot';
    }
  }

  function updateOutput(text) {
    const out = document.getElementById('qwen-result-output');
    if (out) out.textContent = text;
  }

  async function solveTask(taskPrompt) {
    if (!config.enabled) return;
    updateOutput('⏳ Отправка в локальную модель Qwen...');

    const prompt = `Ты — эксперт по решению олимпиадных задач и тестов. Реши следующую задачу подробно, дай краткое обоснование и в конце напиши точный ответ.\n\nЗадача:\n${taskPrompt}`;

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера (${response.status}). Проверьте настройки CORS и запущен ли локальный сервер.`);
      }

      const data = await response.json();
      const answer = data.response || (data.choices && data.choices[0].message.content) || JSON.stringify(data);
      updateOutput(answer);

    } catch (err) {
      updateOutput(`❌ Ошибка подключения!\n\nДетали: ${err.message}\n\nУбедитесь, что запущен Ollama с параметром OLLAMA_ORIGINS="*"`);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
  } else {
    initModule();
  }
})();
