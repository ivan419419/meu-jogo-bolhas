import { HexGrid, type HexCoord } from "./logica";
import { atirar, encaixar, moverTiro, type Tiro } from "./tiro";
import { resolverEstouro } from "./estouro";
import { criarGeradorDesafio, lerSementeDesafio } from "./desafio";

type CorBolha = "coral" | "azul" | "menta" | "amarelo" | "violeta";

const CORES: Record<CorBolha, { fill: string; light: string; dark: string; label: string; mark: string }> = {
  coral: { fill: "#ff6478", light: "#ffc1ca", dark: "#b82f4b", label: "coral", mark: "●" },
  azul: { fill: "#53b8ff", light: "#c1e8ff", dark: "#2270c1", label: "azul", mark: "◆" },
  menta: { fill: "#54dfb3", light: "#c2ffeb", dark: "#158d70", label: "menta", mark: "✚" },
  amarelo: { fill: "#ffd45d", light: "#fff2b8", dark: "#bd8120", label: "amarelo", mark: "★" },
  violeta: { fill: "#b18aff", light: "#e1d1ff", dark: "#6840bb", label: "violeta", mark: "⬟" },
};

const COLUNAS = 9;
const LINHAS = 16;
const TIROS_INICIAIS = 32;
const VELOCIDADE = 760;
const MIN_ANGULO = -1.22;
const MAX_ANGULO = 1.22;
const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas")!;
const ctx = canvas.getContext("2d")!;
const scoreValue = document.querySelector<HTMLElement>("#scoreValue")!;
const shotsValue = document.querySelector<HTMLElement>("#shotsValue")!;
const currentName = document.querySelector<HTMLElement>("#currentName")!;
const nextName = document.querySelector<HTMLElement>("#nextName")!;
const currentSwatch = document.querySelector<HTMLElement>("#currentSwatch")!;
const nextSwatch = document.querySelector<HTMLElement>("#nextSwatch")!;
const statusText = document.querySelector<HTMLElement>("#statusText")!;
const swapButton = document.querySelector<HTMLButtonElement>("#swapButton")!;
const restartButton = document.querySelector<HTMLButtonElement>("#restartButton")!;
const challengeLabel = document.querySelector<HTMLElement>("#challengeLabel")!;
const challengeDescription = document.querySelector<HTMLElement>("#challengeDescription")!;
const challengeFeedback = document.querySelector<HTMLElement>("#challengeFeedback")!;
const challengeButton = document.querySelector<HTMLButtonElement>("#challengeButton")!;
const scoreShareButton = document.querySelector<HTMLButtonElement>("#scoreShareButton")!;

const padraoInicial: CorBolha[][] = [
  ["coral", "coral", "coral", "menta", "menta", "menta", "amarelo", "amarelo", "amarelo"],
  ["coral", "coral", "menta", "menta", "menta", "amarelo", "amarelo", "violeta", "violeta"],
  ["coral", "coral", "coral", "azul", "azul", "azul", "violeta", "violeta", "violeta"],
  ["coral", "coral", "azul", "azul", "azul", "violeta", "violeta", "amarelo", "amarelo"],
  ["azul", "azul", "azul", "coral", "coral", "amarelo", "amarelo", "amarelo", "menta"],
  ["azul", "azul", "coral", "coral", "coral", "amarelo", "menta", "menta", "menta"],
  ["violeta", "violeta", "violeta", "azul", "azul", "coral", "coral", "menta", "menta"],
];

interface Layout {
  width: number;
  height: number;
  radius: number;
  pitchY: number;
  left: number;
  top: number;
  shooter: { x: number; y: number };
  minX: number;
  maxX: number;
  dangerY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

let grid: HexGrid<CorBolha>;
let layout: Layout;
let current: CorBolha;
let next: CorBolha;
let shotsLeft = TIROS_INICIAIS;
let score = 0;
let activeShot: Tiro<CorBolha> | null = null;
let gameOver: "won" | "lost" | null = null;
let aimPoint = { x: 0, y: 0 };
let pointerInside = false;
let particles: Particle[] = [];
let lastFrame = performance.now();
let notice = "";
let noticeUntil = 0;
let challengeSeed = lerSementeDesafio(new URLSearchParams(window.location.search).get("desafio"));
let gameRandom: () => number = Math.random;

function centroDaCelula(coord: HexCoord): { x: number; y: number } {
  return {
    x: layout.left + layout.radius + coord.col * layout.radius * 2 + (coord.row % 2 ? layout.radius : 0),
    y: layout.top + coord.row * layout.pitchY,
  };
}

function novasCoresDisponiveis(board = grid): CorBolha[] {
  const presentes = new Set<CorBolha>();
  for (const row of board.toMatrix()) for (const value of row) if (value !== null) presentes.add(value);
  return [...presentes];
}

function escolherCor(board = grid): CorBolha {
  const disponiveis = novasCoresDisponiveis(board);
  return disponiveis[Math.floor(gameRandom() * disponiveis.length)] ?? "coral";
}

function codigoDesafio(seed: number): string {
  return seed.toString(36).toUpperCase();
}

function atualizarModoDesafio(): void {
  challengeLabel.textContent = challengeSeed === null ? "PARTIDA LIVRE" : `DESAFIO ${codigoDesafio(challengeSeed)}`;
  challengeDescription.textContent = challengeSeed === null
    ? "Crie um link para todo mundo jogar a mesma fase."
    : "Mesmo tabuleiro e mesma semente para comparar pontuações.";
  challengeButton.textContent = challengeSeed === null ? "Criar desafio" : "Compartilhar desafio";
}

function gerarSementeDesafio(): number {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] || 1;
  }
  return Math.max(1, Math.floor(Math.random() * 0xffffffff));
}

function urlDoDesafio(seed: number): string {
  const url = new URL(window.location.href);
  url.searchParams.set("desafio", String(seed));
  return url.toString();
}

async function compartilharOuCopiar(titulo: string, texto: string, url: string): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({ title: titulo, text: texto, url });
      challengeFeedback.textContent = "Pronto para compartilhar.";
    } else {
      const conteudo = `${texto}\n${url}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(conteudo);
      } else {
        const campo = document.createElement("textarea");
        campo.value = conteudo;
        campo.setAttribute("readonly", "");
        campo.style.position = "fixed";
        campo.style.opacity = "0";
        document.body.append(campo);
        campo.select();
        const copiado = document.execCommand("copy");
        campo.remove();
        if (!copiado) throw new Error("A cópia não foi autorizada pelo navegador.");
      }
      challengeFeedback.textContent = "Link copiado. Cole na conversa para desafiar alguém.";
    }
  } catch (error) {
    challengeFeedback.textContent = error instanceof DOMException && error.name === "AbortError"
      ? "Compartilhamento cancelado."
      : "Não consegui compartilhar automaticamente. Tente novamente.";
  }
}

async function compartilharDesafio(): Promise<void> {
  if (challengeSeed === null) {
    challengeSeed = gerarSementeDesafio();
    const url = new URL(urlDoDesafio(challengeSeed));
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    iniciarPartida();
  }
  const url = urlDoDesafio(challengeSeed);
  await compartilharOuCopiar("Desafio de Bolhas em Órbita", "Jogue comigo nesta mesma fase:", url);
}

async function compartilharResultado(): Promise<void> {
  if (challengeSeed === null) return;
  const pontos = score.toLocaleString("pt-BR");
  const texto = `Fiz ${pontos} pontos no desafio ${codigoDesafio(challengeSeed)} de Bolhas em Órbita. Consegue superar?`;
  await compartilharOuCopiar("Meu placar no desafio de bolhas", texto, urlDoDesafio(challengeSeed));
}

function iniciarPartida(): void {
  gameRandom = challengeSeed === null ? Math.random : criarGeradorDesafio(challengeSeed);
  const matrix: Array<Array<CorBolha | null>> = Array.from({ length: LINHAS }, () => Array<CorBolha | null>(COLUNAS).fill(null));
  padraoInicial.forEach((row, r) => row.forEach((color, c) => { matrix[r][c] = color; }));
  grid = new HexGrid<CorBolha>(matrix);
  score = 0;
  shotsLeft = TIROS_INICIAIS;
  activeShot = null;
  gameOver = null;
  particles = [];
  current = escolherCor();
  next = escolherCor();
  notice = "Acerte três bolhas da mesma cor para estourá-las.";
  noticeUntil = performance.now() + 3600;
  atualizarModoDesafio();
  atualizarPainel();
  desenhar();
}

function atualizarLayout(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const radius = Math.min(22, (width - 28) / (COLUNAS * 2 + 1));
  const boardWidth = radius * (COLUNAS * 2 + 1);
  const left = (width - boardWidth) / 2;
  const top = Math.max(30, radius * 1.9);
  const shooter = { x: width / 2, y: height - radius * 3.55 };
  layout = {
    width,
    height,
    radius,
    pitchY: Math.sqrt(3) * radius,
    left,
    top,
    shooter,
    minX: left + radius,
    maxX: left + radius * COLUNAS * 2,
    dangerY: shooter.y - radius * 2.25,
  };
  desenhar();
}

function anguloPara(alvo: { x: number; y: number }): number {
  const raw = Math.atan2(alvo.x - layout.shooter.x, layout.shooter.y - alvo.y);
  return Math.max(MIN_ANGULO, Math.min(MAX_ANGULO, raw));
}

function colisaoComBolha(x: number, y: number): boolean {
  const matriz = grid.toMatrix();
  for (let row = 0; row < matriz.length; row += 1) {
    for (let col = 0; col < matriz[row].length; col += 1) {
      if (matriz[row][col] === null) continue;
      const center = centroDaCelula({ row, col });
      if (Math.hypot(x - center.x, y - center.y) <= layout.radius * 1.96) return true;
    }
  }
  return false;
}

function terminouTrajeto(x: number, y: number): boolean {
  return y <= layout.top + layout.radius || colisaoComBolha(x, y);
}

function preverMira(angle: number): Array<{ x: number; y: number }> {
  let shot = atirar(angle, layout.shooter, VELOCIDADE, current);
  const points = [{ x: shot.x, y: shot.y }];
  let previousDirection = Math.sign(shot.vx);
  const step = 1 / 120;
  for (let i = 0; i < 720; i += 1) {
    const moved = moverTiro(shot, step, { minX: layout.minX, maxX: layout.maxX });
    const direction = Math.sign(moved.vx);
    if (previousDirection !== 0 && direction !== 0 && direction !== previousDirection) {
      points.push({ x: moved.x, y: moved.y });
    }
    shot = moved;
    if (terminouTrajeto(shot.x, shot.y)) {
      points.push({ x: shot.x, y: shot.y });
      return points;
    }
    previousDirection = direction;
  }
  points.push({ x: shot.x, y: shot.y });
  return points;
}

function disparar(alvo: { x: number; y: number }): void {
  if (activeShot || gameOver || shotsLeft <= 0) return;
  const angle = anguloPara(alvo);
  activeShot = atirar(angle, layout.shooter, VELOCIDADE, current);
  shotsLeft -= 1;
  notice = "";
  atualizarPainel();
}

function encaixarTiro(): void {
  if (!activeShot) return;
  const result = encaixar(grid, { x: activeShot.x, y: activeShot.y }, activeShot.value, centroDaCelula, layout.radius * 1.9);
  if (!result) {
    activeShot = null;
    notice = "Não encontrei espaço para encaixar. Toque em jogar de novo.";
    noticeUntil = performance.now() + 4000;
    gameOver = "lost";
    atualizarPainel();
    return;
  }

  const resolution = resolverEstouro(result.grid, result.coord, 3);
  grid = resolution.grid;
  const removed = resolution.estouradas.length;
  const fallen = resolution.caidas.length;
  score += removed * 10 + fallen * 15 + (removed >= 4 ? (removed - 3) * 5 : 0);
  if (removed || fallen) {
    soltarParticulas(resolution.estouradas, false);
    soltarParticulas(resolution.caidas, true);
    const total = removed + fallen;
    notice = fallen ? `Boa! ${removed} estouradas + ${fallen} que caíram` : `${removed} bolhas estouradas!`;
    noticeUntil = performance.now() + 2200;
  } else {
    notice = "Tente conectar três bolhas da mesma cor.";
    noticeUntil = performance.now() + 1700;
  }

  activeShot = null;
  if (novasCoresDisponiveis().length === 0) {
    gameOver = "won";
    notice = "Tabuleiro limpo! Você mandou muito bem.";
    noticeUntil = Number.POSITIVE_INFINITY;
  } else {
    current = next;
    if (!novasCoresDisponiveis().includes(current)) current = escolherCor();
    next = escolherCor();
    if (checarDerrota()) {
      gameOver = "lost";
      notice = "As bolhas chegaram à linha de perigo.";
      noticeUntil = Number.POSITIVE_INFINITY;
    } else if (shotsLeft <= 0) {
      gameOver = "lost";
      notice = "Seus disparos acabaram. Tente outra estratégia.";
      noticeUntil = Number.POSITIVE_INFINITY;
    }
  }
  atualizarPainel();
}

function checarDerrota(): boolean {
  const matrix = grid.toMatrix();
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (matrix[row][col] !== null && centroDaCelula({ row, col }).y + layout.radius >= layout.dangerY) return true;
    }
  }
  return false;
}

function soltarParticulas(cells: Array<{ coord: HexCoord; value: CorBolha }>, falling: boolean): void {
  for (const cell of cells) {
    const center = centroDaCelula(cell.coord);
    const color = CORES[cell.value].fill;
    const count = falling ? 4 : 7;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = falling ? 35 + Math.random() * 80 : 45 + Math.random() * 130;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: falling ? 90 + Math.random() * 120 : Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.5,
        color,
        size: falling ? 2 + Math.random() * 3 : 2 + Math.random() * 4,
      });
    }
  }
}

function trocarBolhas(): void {
  if (gameOver || activeShot) return;
  [current, next] = [next, current];
  atualizarPainel();
}

function atualizarPainel(): void {
  scoreValue.textContent = score.toLocaleString("pt-BR");
  shotsValue.textContent = String(shotsLeft);
  currentName.textContent = CORES[current].label;
  nextName.textContent = CORES[next].label;
  currentSwatch.style.setProperty("--bubble-color", CORES[current].fill);
  nextSwatch.style.setProperty("--bubble-color", CORES[next].fill);
  currentSwatch.setAttribute("aria-label", `Bolha atual: ${CORES[current].label}`);
  nextSwatch.setAttribute("aria-label", `Próxima bolha: ${CORES[next].label}`);
  swapButton.disabled = Boolean(activeShot || gameOver);
  statusText.textContent = gameOver === "won"
    ? "Fase concluída"
    : gameOver === "lost"
      ? "Fim de jogo"
      : activeShot
        ? "Bolha em voo…"
        : notice && performance.now() < noticeUntil
          ? notice
          : "Mire e toque no tabuleiro para disparar";
  statusText.classList.toggle("is-result", Boolean(gameOver));
  scoreShareButton.hidden = challengeSeed === null || gameOver === null;
}

function desenharBolha(x: number, y: number, radius: number, color: CorBolha, mark = true): void {
  const palette = CORES[color];
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.42, radius * 0.05, x, y, radius * 1.1);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(0.38, palette.fill);
  gradient.addColorStop(1, palette.dark);
  ctx.save();
  ctx.shadowColor = `${palette.fill}66`;
  ctx.shadowBlur = radius * 0.42;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.91, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = Math.max(1, radius * 0.075);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x - radius * 0.28, y - radius * 0.42, radius * 0.25, radius * 0.11, -0.45, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.68)";
  ctx.fill();
  if (mark && radius >= 13) {
    ctx.fillStyle = "rgba(18,31,57,.38)";
    ctx.font = `700 ${Math.max(9, radius * 0.48)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(palette.mark, x, y + radius * 0.14);
  }
  ctx.restore();
}

function desenharFundo(): void {
  const { width, height } = layout;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#121d3d");
  bg.addColorStop(0.52, "#18264b");
  bg.addColorStop(1, "#211e49");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 8, width * 0.5, height * 0.35, height * 0.65);
  glow.addColorStop(0, "rgba(95,132,232,.13)");
  glow.addColorStop(1, "rgba(95,132,232,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#a9c3ff";
  for (let i = 0; i < 32; i += 1) {
    const x = ((i * 97 + 23) % 389) / 389 * width;
    const y = ((i * 131 + 41) % 607) / 607 * height;
    ctx.beginPath();
    ctx.arc(x, y, i % 4 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function desenharMira(): void {
  if (activeShot || gameOver) return;
  const angle = anguloPara(pointerInside ? aimPoint : { x: layout.shooter.x, y: layout.shooter.y - 180 });
  const path = preverMira(angle);
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = "rgba(224,236,255,.72)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i += 1) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  const end = path[path.length - 1];
  ctx.beginPath();
  ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#eef5ff";
  ctx.fill();
  ctx.restore();
}

function desenharLancador(): void {
  const { x, y } = layout.shooter;
  const angle = activeShot ? 0 : anguloPara(pointerInside ? aimPoint : { x, y: y - 180 });
  const barrelLength = layout.radius * 2.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#b8c9ff";
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-layout.radius * 0.46, -barrelLength, layout.radius * 0.92, barrelLength + layout.radius * 0.25, layout.radius * 0.42);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const base = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, layout.radius * 1.28);
  base.addColorStop(0, "#8faaff");
  base.addColorStop(1, "#465caa");
  ctx.beginPath();
  ctx.arc(x, y, layout.radius * 1.18, 0, Math.PI * 2);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function desenhar(): void {
  if (!layout) return;
  desenharFundo();
  const boardRight = layout.maxX + layout.radius;
  ctx.save();
  ctx.strokeStyle = "rgba(151,181,255,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(layout.left, layout.top - layout.radius * 0.75);
  ctx.lineTo(boardRight, layout.top - layout.radius * 0.75);
  ctx.stroke();
  ctx.fillStyle = "rgba(195,211,255,.68)";
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TETO", layout.left + 2, layout.top - layout.radius * 0.95);

  ctx.strokeStyle = "rgba(255,113,135,.75)";
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(layout.left, layout.dangerY);
  ctx.lineTo(boardRight, layout.dangerY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,160,174,.78)";
  ctx.textAlign = "right";
  ctx.fillText("PERIGO", boardRight - 1, layout.dangerY - 5);
  ctx.restore();

  const matrix = grid.toMatrix();
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      const value = matrix[row][col];
      if (value === null) continue;
      const center = centroDaCelula({ row, col });
      if (center.y - layout.radius > layout.height) continue;
      desenharBolha(center.x, center.y, layout.radius, value);
    }
  }

  desenharMira();
  desenharLancador();
  if (!activeShot && !gameOver) desenharBolha(layout.shooter.x, layout.shooter.y, layout.radius, current);
  if (activeShot) desenharBolha(activeShot.x, activeShot.y, layout.radius, activeShot.value);

  const now = performance.now();
  particles = particles.filter((p) => p.life > 0);
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 1.8));
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (notice && now < noticeUntil && !gameOver) {
    ctx.save();
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    const textWidth = Math.min(layout.width - 32, ctx.measureText(notice).width + 28);
    const boxY = Math.max(12, layout.top - layout.radius * 1.6);
    ctx.fillStyle = "rgba(10,16,37,.72)";
    ctx.beginPath();
    ctx.roundRect(layout.width / 2 - textWidth / 2, boxY, textWidth, 29, 14);
    ctx.fill();
    ctx.fillStyle = "#f3f6ff";
    ctx.textBaseline = "middle";
    ctx.fillText(notice, layout.width / 2, boxY + 15, textWidth - 14);
    ctx.restore();
  }

  if (gameOver) desenharResultado();
}

function desenharResultado(): void {
  ctx.save();
  ctx.fillStyle = "rgba(8,13,31,.64)";
  ctx.fillRect(0, 0, layout.width, layout.height);
  const boxW = Math.min(layout.width - 44, 330);
  const boxH = 156;
  const x = (layout.width - boxW) / 2;
  const y = layout.height * 0.38;
  ctx.fillStyle = "#202d59";
  ctx.strokeStyle = "rgba(204,219,255,.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 22);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = gameOver === "won" ? "#8ff0c9" : "#ff9ba9";
  ctx.font = "800 25px system-ui, sans-serif";
  ctx.fillText(gameOver === "won" ? "Mandou bem!" : "Fim de jogo", layout.width / 2, y + 44);
  ctx.fillStyle = "#edf2ff";
  ctx.font = "500 14px system-ui, sans-serif";
  ctx.fillText(gameOver === "won" ? `Pontuação: ${score.toLocaleString("pt-BR")}` : notice, layout.width / 2, y + 76, boxW - 30);
  ctx.fillStyle = "#c2d0ff";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillText("Use “Jogar de novo” para outra partida", layout.width / 2, y + 117);
  ctx.restore();
}

function frame(now: number): void {
  const delta = Math.min(0.04, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (activeShot) {
    const steps = Math.max(1, Math.ceil(delta / (1 / 120)));
    const step = delta / steps;
    for (let i = 0; i < steps && activeShot; i += 1) {
      activeShot = moverTiro(activeShot, step, { minX: layout.minX, maxX: layout.maxX });
      if (terminouTrajeto(activeShot.x, activeShot.y)) encaixarTiro();
    }
  }
  for (const particle of particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 180 * delta;
    particle.life -= delta;
  }
  if (notice && performance.now() >= noticeUntil && !gameOver && !activeShot) {
    notice = "";
    atualizarPainel();
  }
  desenhar();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  aimPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  pointerInside = true;
});
canvas.addEventListener("pointerleave", () => { pointerInside = false; });
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType !== "touch") return;
  const rect = canvas.getBoundingClientRect();
  aimPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  pointerInside = true;
  disparar(aimPoint);
});
swapButton.addEventListener("click", trocarBolhas);
restartButton.addEventListener("click", iniciarPartida);
challengeButton.addEventListener("click", () => { void compartilharDesafio(); });
scoreShareButton.addEventListener("click", () => { void compartilharResultado(); });
window.addEventListener("resize", atualizarLayout);

iniciarPartida();
requestAnimationFrame(() => {
  atualizarLayout();
  lastFrame = performance.now();
  requestAnimationFrame(frame);
});
