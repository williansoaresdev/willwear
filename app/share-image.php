<?php
declare(strict_types=1);

/**
 * Gera (e guarda em cache) a imagem de compartilhamento (og:image /
 * twitter:image) de um produto especifico: a foto real do produto,
 * colada sobre o mesmo cartao/template de marca usado em img/og-image.png.
 *
 * Uso: share-image.php?produto=example2.png
 *
 * Se o produto nao for valido, ou o GD nao estiver disponivel no
 * servidor, cai de volta para a imagem generica img/og-image.png — o
 * compartilhamento nunca fica sem imagem.
 */

function servirImagemDoCache(string $caminho): void
{
    header('Content-Type: image/png');
    header('Cache-Control: public, max-age=86400');
    header('Content-Length: ' . (string) filesize($caminho));
    readfile($caminho);
    exit;
}

function redirecionarParaImagemGenerica(): void
{
    header('Location: img/og-image.png', true, 302);
    exit;
}

// ---------- Parametro e validacao (mesmas regras do provador.php) ----------
$produtoRaw = isset($_GET['produto']) ? (string) $_GET['produto'] : '';
$produtoArquivo = basename($produtoRaw);
$extensoesPermitidas = ['png', 'jpg', 'jpeg', 'webp'];
$extensao = strtolower(pathinfo($produtoArquivo, PATHINFO_EXTENSION));
$produtoValido = $produtoArquivo !== '' && in_array($extensao, $extensoesPermitidas, true);

$pastaProdutos = __DIR__ . '/../done/';
$caminhoProduto = $pastaProdutos . $produtoArquivo;

if (!$produtoValido || !is_file($caminhoProduto)) {
    redirecionarParaImagemGenerica();
}

if (!function_exists('imagecreatefrompng') || !function_exists('imagecopyresampled')) {
    // GD nao disponivel neste servidor.
    redirecionarParaImagemGenerica();
}

// ---------- Cache ----------
// A chave inclui mtime + tamanho do arquivo do produto: se a foto for
// substituida (mesmo nome), o cache dessa foto e regenerado sozinho.
$infoArquivo = stat($caminhoProduto);
$chaveCache = md5($produtoArquivo . '|' . $infoArquivo['mtime'] . '|' . $infoArquivo['size']);
$pastaCache = __DIR__ . '/img/cache';
$caminhoCache = $pastaCache . '/' . $chaveCache . '.png';

if (is_file($caminhoCache)) {
    servirImagemDoCache($caminhoCache);
}

$caminhoTemplate = __DIR__ . '/img/share-bg.png';
if (!is_file($caminhoTemplate)) {
    redirecionarParaImagemGenerica();
}

$template = @imagecreatefrompng($caminhoTemplate);
$produtoImg = @imagecreatefrompng($caminhoProduto);

if ($template === false || $produtoImg === false) {
    redirecionarParaImagemGenerica();
}

// Area (dentro do cartao branco) onde a foto do produto entra, em pixels
// — combina com o layout de img/share-bg.png (1200x630).
$areaX = 151;
$areaY = 181;
$areaW = 268;
$areaH = 268;

$larguraProduto = imagesx($produtoImg);
$alturaProduto = imagesy($produtoImg);
$fatorEscala = min($areaW / $larguraProduto, $areaH / $alturaProduto);
$larguraFinal = max(1, (int) round($larguraProduto * $fatorEscala));
$alturaFinal = max(1, (int) round($alturaProduto * $fatorEscala));
$destinoX = $areaX + (int) round(($areaW - $larguraFinal) / 2);
$destinoY = $areaY + (int) round(($areaH - $alturaFinal) / 2);

// Necessario para o PNG com transparencia do produto se misturar
// corretamente com o fundo branco do cartao, em vez de aparecer preto.
imagealphablending($template, true);
imagecopyresampled(
    $template, $produtoImg,
    $destinoX, $destinoY, 0, 0,
    $larguraFinal, $alturaFinal, $larguraProduto, $alturaProduto
);
imagedestroy($produtoImg);

// Tenta gravar em cache para as proximas requisicoes; se nao der (pasta
// sem permissao de escrita, etc.), so segue e serve a imagem gerada agora.
if (!is_dir($pastaCache)) {
    @mkdir($pastaCache, 0775, true);
}
if (is_dir($pastaCache) && is_writable($pastaCache)) {
    @imagepng($template, $caminhoCache, 6);
}

header('Content-Type: image/png');
header('Cache-Control: public, max-age=86400');
imagepng($template);
imagedestroy($template);
exit;
