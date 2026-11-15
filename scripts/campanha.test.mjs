import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browserPath = resolve(projectRoot, "game/browser.ts");
const campaignPath = resolve(projectRoot, "game/campanha.ts");

// Isto só é anexado à entrada efêmera do bundle de teste; browser.ts e build normal ficam intactos.
const testHooks = `
;(globalThis).__test = {
  get snapshot() {
    return {
      campaignActive,
      campaignLevel,
      gameOver,
      shotsLeft,
      score,
      challengeSeed,
      loopStopped,
      transitionStarted,
      transitionPending: transitionTimer !== null,
      activeShot: activeShot ? { ...activeShot } : null,
      current,
      next,
      grid: grid.toMatrix(),
      listenersAborted: gameListeners.signal.aborted,
    };
  },
  get totalCampaignPhases() { return TOTAL_FASES_CAMPANHA; },
  getCampaignConfig: (phase) => obterConfiguracaoFaseCampanha(phase),
  getCampaignBoard: (phase) => criarTabuleiroCampanha(phase),
  startCampaign: () => iniciarCampanha(),
  advanceCampaign: () => avancarFaseCampanha(),
  exitCampaign: () => sairDaCampanha(),
  restart: () => iniciarPartida(),
  setGameOver: (value) => { gameOver = value; atualizarPainel(); },
  winWithTopTriple: () => {
    const matrix = Array.from({ length: LINHAS }, () => Array(COLUNAS).fill(null));
    matrix[0][0] = "coral";
    matrix[0][1] = "coral";
    grid = new HexGrid(matrix);
    activeShot = { x: centroDaCelula({ row: 0, col: 2 }).x, y: centroDaCelula({ row: 0, col: 2 }).y, vx: 0, vy: 0, value: "coral" };
    gameOver = null;
    encaixarTiro();
  },
};
`;

let bundledCode;
async function getBundle() {
  if (bundledCode) return bundledCode;
  const source = await readFile(browserPath, "utf8");
  const result = await build({
    stdin: {
      contents: `${source}\n${testHooks}`,
      resolveDir: resolve(projectRoot, "game"),
      sourcefile: "browser.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  bundledCode = result.outputFiles[0].text;
  return bundledCode;
}

function makeContext(search = "", storage = new Map()) {
  const elements = new Map();
  const rafs = new Map();
  const timers = new Map();
  const assignedUrls = [];
  const timerClears = [];
  const rafCancels = [];
  const reloads = [];
  let nextRaf = 1;
  let nextTimer = 1;

  function noOpContext() {
    const gradient = { addColorStop() {} };
    return new Proxy({
      createRadialGradient: () => gradient,
      createLinearGradient: () => gradient,
      measureText: (text) => ({ width: String(text).length * 7 }),
    }, {
      get(target, property) {
        if (property in target) return target[property];
        return function canvasNoOp() { return this; };
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    });
  }

  class FakeElement {
    constructor(id) {
      this.id = id;
      this.hidden = false;
      this.disabled = false;
      this.textContent = "";
      this.value = "";
      this.style = { setProperty() {} };
      this.attributes = new Map();
      this.classList = { toggle() {} };
      this.listeners = new Map();
      this.width = 420;
      this.height = 720;
    }
    addEventListener(type, callback, options = {}) {
      const entry = { callback, active: true };
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(entry);
      const signal = options?.signal;
      if (signal) {
        const remove = () => { entry.active = false; };
        if (signal.aborted) remove();
        else signal.addEventListener("abort", remove, { once: true });
      }
    }
    removeEventListener(type, callback) {
      for (const entry of this.listeners.get(type) ?? []) {
        if (entry.callback === callback) entry.active = false;
      }
    }
    dispatch(type, event = {}) {
      for (const entry of [...(this.listeners.get(type) ?? [])]) {
        if (entry.active) entry.callback({ type, target: this, ...event });
      }
    }
    liveListenerCount(type) {
      const entries = type ? (this.listeners.get(type) ?? []) : [...this.listeners.values()].flat();
      return entries.filter((entry) => entry.active).length;
    }
    getContext() { return noOpContext(); }
    getBoundingClientRect() { return { left: 0, top: 0, width: 420, height: 720 }; }
    matches() { return false; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    select() {}
    remove() {}
    append() {}
  }

  const selectors = [
    "#gameCanvas", "#scoreValue", "#shotsValue", "#currentName", "#nextName",
    "#currentSwatch", "#nextSwatch", "#statusText", "#swapButton", "#restartButton",
    "#challengeLabel", "#challengeDescription", "#challengeFeedback", "#challengeButton",
    "#scoreShareButton", "#tiktokEndLink", "#challengeCard", "#campaignButton",
    "#nextCampaignButton", "#fenixButton", "#introHelp",
  ];
  for (const selector of selectors) elements.set(selector, new FakeElement(selector));
  const canvas = elements.get("#gameCanvas");

  const windowListeners = new FakeElement("window");
  const location = {
    href: `https://example.test/game${search}`,
    search,
    pathname: "/game",
    hash: "",
    assign(url) { assignedUrls.push(url); },
    reload() { reloads.push(true); },
  };
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  const window = {
    location,
    localStorage,
    history: {
      state: null,
      replaceState(_state, _title, nextUrl) {
        if (!nextUrl) return;
        const parsed = new URL(nextUrl, location.href);
        location.href = parsed.toString();
        location.search = parsed.search;
        location.pathname = parsed.pathname;
        location.hash = parsed.hash;
      },
    },
    devicePixelRatio: 1,
    crypto: undefined,
    addEventListener: windowListeners.addEventListener.bind(windowListeners),
    removeEventListener: windowListeners.removeEventListener.bind(windowListeners),
    requestAnimationFrame(callback) {
      const id = nextRaf++;
      rafs.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      rafCancels.push(id);
      rafs.delete(id);
    },
    setTimeout(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timerClears.push(id);
      timers.delete(id);
    },
  };
  const document = {
    querySelector(selector) { return elements.get(selector) ?? null; },
    createElement(tag) { return new FakeElement(tag); },
    body: { append() {} },
    execCommand() { return true; },
  };
  const sandbox = {
    window,
    document,
    navigator: { clipboard: { async writeText() {} } },
    performance: { now: () => 1000 },
    URL,
    URLSearchParams,
    AbortController,
    Uint32Array,
    Math,
    console,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
  };
  vm.runInNewContext(bundledCode, sandbox, { filename: "browser.test.bundle.js" });

  return {
    api: sandbox.__test,
    elements,
    storage,
    window,
    windowListeners,
    rafs,
    timers,
    assignedUrls,
    timerClears,
    rafCancels,
    reloads,
    flushRaf(id = rafs.keys().next().value) {
      const callback = rafs.get(id);
      assert.ok(callback, `requestAnimationFrame ${id} deveria estar pendente`);
      rafs.delete(id);
      callback(1016);
    },
    flushTimer(id = timers.keys().next().value) {
      const timer = timers.get(id);
      assert.ok(timer, `timer ${id} deveria estar pendente`);
      timers.delete(id);
      timer.callback();
    },
    allLiveListeners() {
      return [...elements.values()].reduce((total, element) => total + element.liveListenerCount(), 0)
        + windowListeners.liveListenerCount();
    },
  };
}

async function freshGame(search = "", storage = new Map()) {
  await getBundle();
  const game = makeContext(search, storage);
  // Executa o bootstrap RAF para calcular layout/centros sem depender de relógio real.
  game.flushRaf();
  return game;
}

const click = (game, selector) => {
  game.windowListeners.dispatch("pointerdown", { pointerType: "mouse" });
  game.elements.get(selector).dispatch("click");
  const deferredHide = [...game.timers].find(([, timer]) => timer.delay === 0);
  if (deferredHide) game.flushTimer(deferredHide[0]);
};
const colorsCount = (matrix) => matrix.flat().filter((cell) => cell !== null).length;

// Também garante que o arquivo de dados de campanha seja compilável sem depender de UI.
async function campaignDataBundle() {
  const source = await readFile(campaignPath, "utf8");
  const result = await build({
    stdin: { contents: source, resolveDir: resolve(projectRoot, "game"), sourcefile: "campanha.ts", loader: "ts" },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

// Usa eval apenas dentro de um contexto vazio para inspecionar os exports compilados de campanha.
async function getCampaignData() {
  const code = await campaignDataBundle();
  const sandbox = { exports: {}, module: { exports: {} } };
  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports;
}

test("dados da campanha: dez fases determinísticas e tabuleiros/configurações independentes por cópia", async () => {
  const { criarTabuleiroCampanha, obterConfiguracaoFaseCampanha, TOTAL_FASES_CAMPANHA } = await getCampaignData();
  assert.equal(TOTAL_FASES_CAMPANHA, 10);
  for (let phase = 1; phase <= TOTAL_FASES_CAMPANHA; phase += 1) {
    const config = obterConfiguracaoFaseCampanha(phase);
    const boardA = criarTabuleiroCampanha(phase);
    const boardB = criarTabuleiroCampanha(phase);
    assert.deepEqual(config, obterConfiguracaoFaseCampanha(phase));
    assert.deepEqual(boardA, boardB);
    assert.equal(boardA.length, 16);
    assert.ok(boardA.every((row) => row.length === 9));
    assert.equal(colorsCount(boardA), config.linhas * 9);
    boardA[0][0] = boardA[0][0] === null ? "coral" : null;
    assert.deepEqual(boardB, criarTabuleiroCampanha(phase), "mutações não devem vazar para chamadas subsequentes");
    config.tiros = -1;
    assert.notEqual(obterConfiguracaoFaseCampanha(phase).tiros, -1);
  }
  assert.throws(() => obterConfiguracaoFaseCampanha(0), (error) => error?.name === "RangeError");
  assert.throws(() => obterConfiguracaoFaseCampanha(11), (error) => error?.name === "RangeError");
});

test("partida livre conserva o tabuleiro original de 63 bolhas e 32 tiros", async () => {
  const game = await freshGame();
  const state = game.api.snapshot;
  assert.equal(state.campaignActive, false);
  assert.equal(state.challengeSeed, null);
  assert.equal(colorsCount(state.grid), 63);
  assert.equal(state.shotsLeft, 32);
});

test("instrução da abertura some após o primeiro toque, tecla ou 6,5 segundos", async () => {
  const touch = await freshGame();
  const touchHelp = touch.elements.get("#introHelp");
  assert.equal(touchHelp.hidden, false);
  assert.equal([...touch.timers.values()][0].delay, 6500);
  touch.windowListeners.dispatch("pointerdown", { pointerType: "touch" });
  const touchHide = [...touch.timers].find(([, timer]) => timer.delay === 0);
  assert.ok(touchHide, "toque agenda a remoção após o evento atual");
  assert.equal(touchHelp.hidden, false, "o tabuleiro não muda de posição durante o evento do toque");
  touch.flushTimer(touchHide[0]);
  assert.equal(touchHelp.hidden, true);
  assert.equal(touch.timers.size, 0);

  const keyboard = await freshGame();
  keyboard.windowListeners.dispatch("keydown", {
    code: "ArrowRight",
    target: keyboard.elements.get("#gameCanvas"),
    preventDefault() {},
  });
  const keyboardHide = [...keyboard.timers].find(([, timer]) => timer.delay === 0);
  assert.ok(keyboardHide, "tecla agenda o fechamento da instrução");
  keyboard.flushTimer(keyboardHide[0]);
  assert.equal(keyboard.elements.get("#introHelp").hidden, true);

  const elapsed = await freshGame();
  elapsed.flushTimer();
  assert.equal(elapsed.elements.get("#introHelp").hidden, true);
});

test("desafio mantém tabuleiro e cores seeded iguais ao reiniciar, com 63 bolhas e 32 tiros", async () => {
  const game = await freshGame("?desafio=123456");
  const first = game.api.snapshot;
  assert.equal(first.challengeSeed, 123456);
  assert.equal(colorsCount(first.grid), 63);
  assert.equal(first.shotsLeft, 32);
  click(game, "#restartButton");
  const restarted = game.api.snapshot;
  assert.deepEqual(restarted.grid, first.grid);
  assert.equal(restarted.current, first.current);
  assert.equal(restarted.next, first.next);
  assert.equal(restarted.challengeSeed, first.challengeSeed);
  assert.equal(restarted.shotsLeft, 32);
});

test("campanha restaura fase, tabuleiro, pontuação, munição e vitória após recarregar sem revelar o destino antes do final", async () => {
  const storage = new Map();
  const game = await freshGame("", storage);
  click(game, "#campaignButton");
  game.api.winWithTopTriple();
  const savedPhaseOne = JSON.parse(storage.get("bolhas-fenix-campanha-v1"));
  assert.equal(savedPhaseOne.fase, 1);
  assert.equal(savedPhaseOne.resultado, "won");
  assert.equal(savedPhaseOne.tiros, 14);

  const freeMode = await freshGame("", storage);
  assert.equal(freeMode.api.snapshot.campaignActive, false);
  assert.equal(freeMode.api.snapshot.shotsLeft, 32);
  assert.equal(freeMode.elements.get("#campaignButton").textContent, "Continuar campanha • fase 1/10");
  click(freeMode, "#campaignButton");
  const restored = freeMode;
  const state = restored.api.snapshot;
  assert.equal(state.campaignActive, true);
  assert.equal(state.campaignLevel, 1);
  assert.equal(state.gameOver, "won");
  assert.equal(state.shotsLeft, savedPhaseOne.tiros);
  assert.equal(state.score, savedPhaseOne.pontuacao);
  assert.equal(JSON.stringify(state.grid), JSON.stringify(savedPhaseOne.tabuleiro));
  assert.equal(restored.elements.get("#nextCampaignButton").hidden, false);
  assert.equal(restored.elements.get("#fenixButton").hidden, true);
  assert.equal(restored.elements.get("#fenixButton").textContent, "Continuar");
  assert.doesNotMatch(restored.elements.get("#challengeDescription").textContent, /Fênix|fenix/i);
  assert.equal(restored.window.location.search, "?campanha=1");

  click(restored, "#nextCampaignButton");
  assert.equal(restored.api.snapshot.campaignLevel, 2);
  const savedPhaseTwo = JSON.parse(storage.get("bolhas-fenix-campanha-v1"));
  assert.equal(savedPhaseTwo.fase, 2);
  assert.equal(savedPhaseTwo.resultado, null);
  assert.equal(savedPhaseTwo.tiros, 15);
  const restoredAgain = await freshGame("?campanha=1", storage);
  assert.equal(restoredAgain.api.snapshot.campaignLevel, 2);
  assert.equal(restoredAgain.api.snapshot.shotsLeft, 15);
  assert.equal(JSON.stringify(restoredAgain.api.snapshot.grid), JSON.stringify(savedPhaseTwo.tabuleiro));
});

test("parâmetro desafio ignora snapshot da campanha e não o sobrescreve", async () => {
  const storage = new Map();
  const campaign = await freshGame("", storage);
  click(campaign, "#campaignButton");
  campaign.api.winWithTopTriple();
  const before = storage.get("bolhas-fenix-campanha-v1");
  const challenge = await freshGame("?desafio=123456", storage);
  assert.equal(challenge.api.snapshot.campaignActive, false);
  assert.equal(challenge.api.snapshot.challengeSeed, 123456);
  assert.equal(challenge.api.snapshot.shotsLeft, 32);
  assert.equal(storage.get("bolhas-fenix-campanha-v1"), before);
});

test("snapshot inválido é descartado sem impedir o modo livre", async () => {
  const storage = new Map([["bolhas-fenix-campanha-v1", "{json quebrado"]]);
  const game = await freshGame("", storage);
  assert.equal(game.api.snapshot.campaignActive, false);
  assert.equal(game.api.snapshot.shotsLeft, 32);
  assert.equal(storage.has("bolhas-fenix-campanha-v1"), false);
});

test("campanha inicia na fase 1 e só avança depois de uma vitória, sem passar da fase 10", async () => {
  const game = await freshGame();
  click(game, "#nextCampaignButton");
  assert.equal(game.api.snapshot.campaignActive, false, "não inicia/avança via botão de próxima fase fora da campanha");
  click(game, "#campaignButton");
  assert.equal(game.api.snapshot.campaignActive, true);
  assert.equal(game.api.snapshot.campaignLevel, 1);
  const phaseOne = game.api.snapshot;
  click(game, "#restartButton");
  assert.equal(game.api.snapshot.current, phaseOne.current, "RNG da fase deve ser fixo ao reiniciar");
  assert.equal(game.api.snapshot.next, phaseOne.next, "próxima bolha também deve ser determinística");
  game.api.advanceCampaign();
  assert.equal(game.api.snapshot.campaignLevel, 1, "sem vitória a fase permanece igual");

  for (let phase = 1; phase < 10; phase += 1) {
    game.api.winWithTopTriple();
    assert.equal(game.api.snapshot.gameOver, "won");
    click(game, "#nextCampaignButton");
    assert.equal(game.api.snapshot.campaignLevel, phase + 1);
    assert.equal(game.api.snapshot.gameOver, null);
  }
  game.api.setGameOver("won");
  game.api.advanceCampaign();
  assert.equal(game.api.snapshot.campaignLevel, 10);
  assert.equal(game.api.snapshot.gameOver, "won");
});

test("derrota não avança fase nem navega para Fênix Blast", async () => {
  const game = await freshGame();
  click(game, "#campaignButton");
  game.api.setGameOver("lost");
  click(game, "#nextCampaignButton");
  click(game, "#fenixButton");
  assert.equal(game.api.snapshot.campaignLevel, 1);
  assert.equal(game.api.snapshot.gameOver, "lost");
  assert.equal(game.timers.size, 0);
  assert.deepEqual(game.assignedUrls, []);
});

test("vitória real na fase 10 agenda uma única transição; timer navega uma vez e encerra listeners/RAF", async () => {
  const game = await freshGame();
  click(game, "#campaignButton");
  for (let phase = 1; phase < 10; phase += 1) {
    game.api.winWithTopTriple();
    click(game, "#nextCampaignButton");
  }
  assert.equal(game.api.snapshot.campaignLevel, 10);
  // Ativa o ciclo de animação para verificar cancelamento sem depender de tempo real.
  game.flushRaf();
  assert.ok(game.rafs.size > 0);

  game.api.winWithTopTriple();
  const won = game.api.snapshot;
  assert.equal(won.gameOver, "won");
  assert.equal(won.transitionPending, true);
  assert.equal(game.elements.get("#fenixButton").hidden, false);
  assert.equal(game.elements.get("#fenixButton").textContent, "Ir ao Fênix Blast agora");
  assert.equal(game.timers.size, 1);
  assert.equal([...game.timers.values()][0].delay, 6000);
  game.flushTimer();
  assert.equal(game.assignedUrls.length, 1, "callback único do timer deve navegar uma única vez");
  assert.equal(game.rafs.size, 0, "encerramento deve cancelar RAF");
  assert.equal([...game.elements.values()].reduce((total, element) => total + element.liveListenerCount(), 0), 0,
    "encerramento deve abortar listeners de controles");
  assert.equal(game.windowListeners.liveListenerCount("resize"), 0, "resize deve ser abortado");
  assert.equal(game.windowListeners.liveListenerCount("keydown"), 0, "teclado deve ser abortado");
  assert.equal(game.windowListeners.liveListenerCount("pagehide"), 0, "pagehide deve ser abortado");
  assert.equal(game.windowListeners.liveListenerCount("pageshow"), 1, "pageshow BFcache persiste fora do signal");
  assert.equal(game.api.snapshot.listenersAborted, true);
  assert.ok(game.timerClears.length >= 1, "encerramento limpa o handle do timer de transição");
  assert.deepEqual(game.assignedUrls, ["https://fenix-blast-g0x3041f8-fenix-blast.vercel.app/"]);
  assert.equal(game.api.snapshot.loopStopped, true);
});

test("sair da campanha e reiniciar fase cancelam o timer de transição já agendado", async (t) => {
  await t.test("sair cancela timer e não navega", async () => {
    const game = await freshGame();
    click(game, "#campaignButton");
    for (let phase = 1; phase < 10; phase += 1) {
      game.api.winWithTopTriple();
      click(game, "#nextCampaignButton");
    }
    game.api.winWithTopTriple();
    assert.equal(game.timers.size, 1);
    click(game, "#campaignButton");
    assert.equal(game.api.snapshot.campaignActive, false);
    assert.equal(game.timers.size, 0);
    assert.ok(game.timerClears.length >= 1);
    assert.deepEqual(game.assignedUrls, []);
  });

  await t.test("reiniciar fase cancela timer e restaura estado não concluído", async () => {
    const game = await freshGame();
    click(game, "#campaignButton");
    for (let phase = 1; phase < 10; phase += 1) {
      game.api.winWithTopTriple();
      click(game, "#nextCampaignButton");
    }
    game.api.winWithTopTriple();
    assert.equal(game.timers.size, 1);
    click(game, "#restartButton");
    assert.equal(game.timers.size, 0);
    assert.ok(game.timerClears.length >= 1);
    assert.equal(game.api.snapshot.campaignLevel, 10);
    assert.equal(game.api.snapshot.gameOver, null);
    assert.equal(game.api.snapshot.transitionPending, false);
    assert.deepEqual(game.assignedUrls, []);
  });
});

test("botão e callback atrasado do timer não conseguem fazer duas navegações", async () => {
  const game = await freshGame();
  click(game, "#campaignButton");
  for (let phase = 1; phase < 10; phase += 1) {
    game.api.winWithTopTriple();
    click(game, "#nextCampaignButton");
  }
  game.api.winWithTopTriple();
  const delayedCallback = [...game.timers.values()][0].callback;
  click(game, "#fenixButton");
  delayedCallback();
  click(game, "#fenixButton");
  assert.equal(game.assignedUrls.length, 1);
  assert.equal(game.timers.size, 0);
  assert.equal(game.rafs.size, 0);
});

test("pagehide encerra o motor e pageshow BFCache pede recarga sem rearmar transição", async () => {
  const game = await freshGame();
  game.windowListeners.dispatch("pagehide");
  assert.equal(game.api.snapshot.loopStopped, true);
  assert.equal(game.rafs.size, 0);
  assert.equal(game.api.snapshot.listenersAborted, true);
  game.windowListeners.dispatch("pageshow", { persisted: true });
  assert.equal(game.reloads.length, 1);
  assert.equal(game.rafs.size, 0);
  assert.deepEqual(game.assignedUrls, []);
});
