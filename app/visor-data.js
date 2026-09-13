/*
 * Monta os dados da página (título, meta tags, imagem do produto) a partir
 * da query string, no navegador. Usado só por visor.html — a versão para
 * hospedagem com PHP (index.php) faz esse mesmo trabalho no servidor,
 * então não carrega este script.
 *
 * Precisa rodar ANTES de ar.js.
 */
(() => {
  "use strict";

  const PASTA_PRODUTOS = "../done/";

  const params = new URLSearchParams(location.search);
  const produtoParam = params.get("produto");
  const tituloParam = params.get("titulo");
  const tituloTexto = (tituloParam && tituloParam.trim()) || "Produto sem título";

  function absoluta(caminhoRelativo) {
    return new URL(caminhoRelativo, document.baseURI).href;
  }

  function setMeta(id, valor) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("content", valor);
  }

  const tituloPagina = `${tituloTexto} — Provador Virtual`;
  const descricaoTexto = `Experimente "${tituloTexto}" em você, em tempo real, direto pela câmera do celular.`;

  document.title = tituloPagina;
  const tituloEl = document.getElementById("titulo-produto");
  const tituloInfoEl = document.getElementById("titulo-produto-info");
  if (tituloEl) tituloEl.textContent = tituloTexto;
  if (tituloInfoEl) tituloInfoEl.textContent = tituloTexto;

  setMeta("meta-description", descricaoTexto);
  setMeta("meta-og-title", tituloPagina);
  setMeta("meta-og-desc", descricaoTexto);
  setMeta("meta-og-url", location.href);
  setMeta("meta-og-image", absoluta("img/og-image.png"));
  setMeta("meta-tw-title", tituloPagina);
  setMeta("meta-tw-desc", descricaoTexto);
  setMeta("meta-tw-image", absoluta("img/og-image.png"));

  const arHint = document.getElementById("ar-hint");
  const produtoImg = document.getElementById("produto-img");

  if (!produtoParam) {
    if (arHint) arHint.textContent = "Nenhum produto informado (use ?produto=arquivo.png)";
    return;
  }

  produtoImg.alt = tituloTexto;
  produtoImg.addEventListener("load", () => {
    produtoImg.hidden = false;
  });
  produtoImg.addEventListener("error", () => {
    if (arHint) arHint.textContent = `Não foi possível carregar "${produtoParam}" em /done`;
  });
  produtoImg.src = PASTA_PRODUTOS + encodeURIComponent(produtoParam);
})();
