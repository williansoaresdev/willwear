<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=UTF-8');

/**
 * Catálogo — página inicial do app. Lista os produtos disponíveis e linka
 * cada um para provador.php com "produto" e "titulo" já preenchidos.
 *
 * Cada item aponta para um arquivo dentro de /done (gerado pelo
 * remove_bg.py). Para adicionar um produto novo, basta incluir uma linha
 * na lista abaixo.
 */

function h(string $valor): string
{
    return htmlspecialchars($valor, ENT_QUOTES, 'UTF-8');
}

$produtos = [
    ['arquivo' => 'bone1.png', 'titulo' => 'Boné aba curva Strongers'],
    ['arquivo' => 'example1.png', 'titulo' => 'Camisa gola polo verde'],
    ['arquivo' => 'example2.png', 'titulo' => 'Camila gola polo preta'],
    ['arquivo' => 'vestidoamarelo1.png', 'titulo' => 'Vestilo de alça amarelo'],
];

$pastaProdutos = __DIR__ . '/../done/';
foreach ($produtos as &$produto) {
    $produto['existe'] = is_file($pastaProdutos . $produto['arquivo']);
}
unset($produto);

$tituloPagina = 'Catálogo — Provador Virtual';
$descricaoTexto = 'Escolha uma peça e experimente em você, em tempo real, direto pela câmera do celular.';
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title><?= h($tituloPagina) ?></title>

<link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="img/favicon-16.png">
<link rel="shortcut icon" href="img/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="img/apple-touch-icon.png">

<meta name="description" content="<?= h($descricaoTexto) ?>">

<!-- Open Graph (Facebook, WhatsApp, etc.) -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Provador Virtual">
<meta property="og:title" content="<?= h($tituloPagina) ?>">
<meta property="og:description" content="<?= h($descricaoTexto) ?>">
<meta property="og:image" content="img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= h($tituloPagina) ?>">
<meta name="twitter:description" content="<?= h($descricaoTexto) ?>">
<meta name="twitter:image" content="img/og-image.png">

<link rel="stylesheet" href="visor.css">
</head>
<body>

<div class="phone-frame">
  <div class="app-screen" id="app-screen">

    <div class="status-bar" aria-hidden="true">
      <span id="status-clock">--:--</span>
      <span class="status-icons">
        <svg viewBox="0 0 20 14" class="i-signal"><rect x="0" y="8" width="3" height="6" rx="0.5"/><rect x="5.5" y="5" width="3" height="9" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/><rect x="16.5" y="0" width="3" height="14" rx="0.5"/></svg>
        <svg viewBox="0 0 24 16" class="i-battery"><rect x="0.5" y="0.5" width="20" height="15" rx="3" fill="none" stroke="currentColor"/><rect x="21.5" y="5" width="2" height="6" rx="1"/><rect x="2.5" y="2.5" width="15" height="11" rx="1.5"/></svg>
      </span>
    </div>

    <header class="topbar">
      <h1 class="titulo">Catálogo</h1>
    </header>

    <main class="catalog-main" id="catalog-main">
      <span class="info-tag">PROVADOR VIRTUAL</span>

      <div class="catalog-grid">
        <?php foreach ($produtos as $produto): ?>
        <a class="catalog-card" href="provador.php?produto=<?= rawurlencode($produto['arquivo']) ?>&titulo=<?= rawurlencode($produto['titulo']) ?>">
          <div class="catalog-card-img-wrap">
            <?php if ($produto['existe']): ?>
            <img class="catalog-card-img" src="../done/<?= rawurlencode($produto['arquivo']) ?>" alt="<?= h($produto['titulo']) ?>" loading="lazy">
            <?php else: ?>
            <span class="catalog-card-missing">Foto indisponível</span>
            <?php endif; ?>
          </div>
          <div class="catalog-card-body">
            <p class="catalog-card-title"><?= h($produto['titulo']) ?></p>
            <span class="catalog-card-cta">
              Provar agora
              <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
        </a>
        <?php endforeach; ?>
      </div>
    </main>

    <div class="home-indicator" aria-hidden="true"></div>
  </div>
</div>

</body>
</html>
