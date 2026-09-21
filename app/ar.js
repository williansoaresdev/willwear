/*
 * Provador em Realidade Aumentada: câmera, gestos (arrastar/pinçar/girar),
 * zoom, compartilhar e o botão do WhatsApp.
 *
 * Este script NÃO monta título, meta tags ou a imagem do produto — isso é
 * feito antes dele rodar (pelo PHP em provador.php, ou por visor-data.js na
 * versão estática visor.html). Aqui ele só lê o que já está no DOM.
 */
(() => {
  "use strict";

  const WHATSAPP_NUMERO = "5519994714115";
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 3;

  const els = {
    titulo: document.getElementById("titulo-produto"),
    video: document.getElementById("camera"),
    stage: document.getElementById("stage"),
    produtoImg: document.getElementById("produto-img"),
    cameraMsg: document.getElementById("camera-message"),
    cameraMsgText: document.getElementById("camera-message-text"),
    retryBtn: document.getElementById("btn-retry-camera"),
    closeMsgBtn: document.getElementById("btn-close-camera-msg"),
    arHint: document.getElementById("ar-hint"),
    zoomIn: document.getElementById("zoom-in"),
    zoomOut: document.getElementById("zoom-out"),
    resetPos: document.getElementById("btn-reset-pos"),
    btnCameraSwitch: document.getElementById("btn-camera-switch"),
    btnChamar: document.getElementById("btn-chamar"),
    btnBack: document.getElementById("btn-back"),
    btnShare: document.getElementById("btn-share"),
    statusClock: document.getElementById("status-clock"),
    appScreen: document.getElementById("app-screen"),
  };

  const tituloTexto = (els.titulo && els.titulo.textContent.trim()) || "Produto";

  // ---------- Relógio decorativo da status bar ----------
  function atualizarRelogio() {
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, "0");
    const mm = String(agora.getMinutes()).padStart(2, "0");
    els.statusClock.textContent = `${hh}:${mm}`;
  }
  atualizarRelogio();
  setInterval(atualizarRelogio, 15000);

  // ---------- Botão voltar (para o catálogo) ----------
  els.btnBack.addEventListener("click", () => {
    location.href = "index.php";
  });

  // ---------- Toast ----------
  function mostrarToast(texto) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = texto;
    els.appScreen.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  // ---------- Compartilhar link ----------
  els.btnShare.addEventListener("click", async () => {
    const dadosCompartilhamento = {
      title: tituloTexto,
      text: `Confira: ${tituloTexto}`,
      url: location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(dadosCompartilhamento);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Erro ao compartilhar:", err);
      }
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(location.href);
        mostrarToast("Link copiado!");
        return;
      } catch (err) {
        console.error("Falha ao copiar link:", err);
      }
    }

    window.prompt("Copie o link:", location.href);
  });

  // ---------- Esconder a dica inicial depois de alguns segundos ----------
  setTimeout(() => els.arHint.classList.add("hidden"), 4500);

  // ==================================================================
  // Câmera
  // ==================================================================
  let currentFacing = "user";
  let currentStream = null;

  function mostrarMensagemCamera(texto, comBotaoRetry) {
    if (!texto) {
      els.cameraMsg.hidden = true;
      return;
    }
    els.cameraMsgText.textContent = texto;
    els.retryBtn.hidden = !comBotaoRetry;
    els.cameraMsg.hidden = false;
  }

  function pararCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
  }

  function mensagemDeErro(err) {
    const inseguro =
      location.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(location.hostname);
    if (inseguro) {
      return "A câmera exige conexão segura (HTTPS) ou localhost. A simulação vai funcionar apenas com a imagem do produto.";
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return "Este navegador não suporta acesso à câmera.";
    }
    if (err && err.name === "NotAllowedError") {
      return "Permissão de câmera negada. Ative o acesso nas configurações do navegador e tente novamente.";
    }
    if (err && err.name === "NotFoundError") {
      return "Nenhuma câmera foi encontrada neste dispositivo.";
    }
    if (err && err.name === "NotReadableError") {
      return "A câmera está sendo usada por outro aplicativo.";
    }
    return "Não foi possível acessar a câmera. A simulação vai funcionar apenas com a imagem do produto.";
  }

  async function iniciarCamera(facing) {
    mostrarMensagemCamera("Ativando câmera…", false);
    pararCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      mostrarMensagemCamera(mensagemDeErro(null), false);
      return;
    }

    try {
      const constraints = {
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      };
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      els.video.srcObject = currentStream;
      els.video.classList.toggle("mirrored", facing === "user");
      mostrarMensagemCamera(null, false);
    } catch (err) {
      console.error("Falha ao acessar câmera:", err);
      mostrarMensagemCamera(mensagemDeErro(err), true);
    }
  }

  els.retryBtn.addEventListener("click", () => iniciarCamera(currentFacing));
  els.closeMsgBtn.addEventListener("click", () => {
    els.cameraMsg.hidden = true;
  });

  els.btnCameraSwitch.addEventListener("click", () => {
    currentFacing = currentFacing === "user" ? "environment" : "user";
    iniciarCamera(currentFacing);
  });

  iniciarCamera(currentFacing);

  // ---------- Desligar a câmera quando a página sai de foco ----------
  // (troca de app, minimizar, abrir o WhatsApp pelo botão "Chamar" etc.)
  let cameraPausadaEmSegundoPlano = false;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cameraPausadaEmSegundoPlano = !!currentStream;
      pararCamera();
    } else if (cameraPausadaEmSegundoPlano) {
      cameraPausadaEmSegundoPlano = false;
      iniciarCamera(currentFacing);
    }
  });

  window.addEventListener("pagehide", pararCamera);

  // ==================================================================
  // AR: arrastar, pinçar (zoom) e girar a imagem do produto
  // ==================================================================
  const overlay = els.produtoImg;
  const transform = { x: 0, y: 0, scale: 1, rotate: 0 };
  const pointers = new Map();
  let dragState = null;
  let gestureState = null;
  let lastTapTime = 0;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function aplicarTransform() {
    overlay.style.transform =
      `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) ` +
      `rotate(${transform.rotate}deg) scale(${transform.scale})`;
  }

  function resetarTransform() {
    transform.x = 0;
    transform.y = 0;
    transform.scale = 1;
    transform.rotate = 0;
    aplicarTransform();
  }

  function distancia(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  function angulo(p1, p2) {
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  }

  function iniciarArrastoUnico(pointerId, x, y) {
    dragState = { pointerId, startX: x, startY: y, origX: transform.x, origY: transform.y };
  }

  overlay.addEventListener("pointerdown", (e) => {
    overlay.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    els.arHint.classList.add("hidden");

    if (pointers.size === 1) {
      iniciarArrastoUnico(e.pointerId, e.clientX, e.clientY);
      gestureState = null;
    } else if (pointers.size === 2) {
      dragState = null;
      const [p1, p2] = [...pointers.values()];
      gestureState = {
        distance: distancia(p1, p2),
        angle: angulo(p1, p2),
        scale: transform.scale,
        rotate: transform.rotate,
      };
    }
  });

  overlay.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1 && dragState && dragState.pointerId === e.pointerId) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      transform.x = dragState.origX + dx;
      transform.y = dragState.origY + dy;
      aplicarTransform();
    } else if (pointers.size === 2 && gestureState) {
      const [p1, p2] = [...pointers.values()];
      const novaDistancia = distancia(p1, p2);
      const novoAngulo = angulo(p1, p2);
      const fatorEscala = novaDistancia / gestureState.distance;
      transform.scale = clamp(gestureState.scale * fatorEscala, MIN_SCALE, MAX_SCALE);
      transform.rotate = gestureState.rotate + (novoAngulo - gestureState.angle);
      aplicarTransform();
    }
  });

  function finalizarPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pointers.size === 0) {
      if (dragState && dragState.pointerId === e.pointerId) {
        const agora = Date.now();
        if (agora - lastTapTime < 300) resetarTransform();
        lastTapTime = agora;
      }
      dragState = null;
      gestureState = null;
    } else if (pointers.size === 1) {
      gestureState = null;
      const [[id, p]] = pointers;
      iniciarArrastoUnico(id, p.x, p.y);
    }
  }
  overlay.addEventListener("pointerup", finalizarPointer);
  overlay.addEventListener("pointercancel", finalizarPointer);

  overlay.addEventListener("dblclick", resetarTransform);

  // Zoom com a roda do mouse (desktop)
  els.stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      transform.scale = clamp(transform.scale + delta, MIN_SCALE, MAX_SCALE);
      aplicarTransform();
    },
    { passive: false }
  );

  // Botões de zoom
  els.zoomIn.addEventListener("click", () => {
    transform.scale = clamp(transform.scale + 0.15, MIN_SCALE, MAX_SCALE);
    aplicarTransform();
  });
  els.zoomOut.addEventListener("click", () => {
    transform.scale = clamp(transform.scale - 0.15, MIN_SCALE, MAX_SCALE);
    aplicarTransform();
  });
  els.resetPos.addEventListener("click", resetarTransform);

  aplicarTransform();

  // ==================================================================
  // Botão "Chamar" -> WhatsApp
  // ==================================================================
  els.btnChamar.addEventListener("click", () => {
    const texto = encodeURIComponent(
      `Olá! Tenho interesse no produto: ${tituloTexto}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`, "_blank", "noopener");
  });
})();
