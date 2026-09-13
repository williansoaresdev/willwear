# WillWear — Provador Virtual

Duas partes que trabalham juntas:

1. **[`remove_bg.py`](remove_bg.py)** — remove o fundo de fotos de roupas em lote, gerando PNGs com fundo transparente.
2. **[`app/`](app)** — um provador virtual mobile que carrega a câmera do celular e sobrepõe a foto do produto (com fundo transparente) em tempo real, como um try-on em realidade aumentada.

O fluxo completo: você tira/recebe fotos das roupas → `remove_bg.py` remove o fundo → o PNG resultante é usado pelo provador virtual, que é compartilhado por um link (ex: WhatsApp) apontando para `app/` com o nome do produto na URL.

## Estrutura do projeto

```
willwear/
├── examples/          # fotos originais a processar (entrada)
├── done/              # PNGs com fundo removido (saída, gerado — não versionado)
├── success/           # originais já processados, movidos daqui (gerado — não versionado)
├── remove_bg.py       # script de remoção de fundo (rembg)
├── requirements.txt   # dependências Python
└── app/
    ├── index.php       # página oficial da hospedagem (PHP 8+)
    ├── visor.html      # mesma página, versão estática (sem PHP) para testes locais
    ├── ar.js            # câmera + gestos de realidade aumentada (usado pelas duas páginas)
    ├── visor-data.js    # monta título/meta/imagem no navegador (só para visor.html)
    ├── visor.css        # estilo
    └── img/             # ícones, favicons e imagem de compartilhamento
```

`done/` e `success/` não vão para o git (veja [`.gitignore`](.gitignore)) — são geradas a cada execução do `remove_bg.py`.

---

## 1. Removendo o fundo das fotos (`remove_bg.py`)

Usa a biblioteca [rembg](https://github.com/danielgatis/rembg) (segmentação por IA, roda local, sem depender de API paga).

### Instalação

```bash
pip install -r requirements.txt
```

### Uso

```bash
python remove_bg.py
```

Por padrão:
- lê todas as imagens (`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`) de [`examples/`](examples)
- salva um PNG com fundo transparente para cada uma em `done/`
- move o arquivo original para `success/` depois de processado com sucesso, para não ser reprocessado na próxima execução

Opções:

```bash
python remove_bg.py --input examples --output done --success success
python remove_bg.py --model u2net       # modelo padrão, rápido em CPU
python remove_bg.py --model bria-rmbg   # modelo mais pesado/preciso
python remove_bg.py --cpu               # força CPU mesmo se houver GPU
python remove_bg.py --max-size 500      # limita a maior dimensão a 500px
```

Cada PNG de saída é reduzido (mantendo a proporção) para no máximo **800px** de largura ou altura por padrão — o provador virtual não precisa de imagens em alta resolução. Imagens menores que isso não são ampliadas.

O script tenta usar GPU (CUDA) automaticamente se o `onnxruntime-gpu` e os drivers estiverem disponíveis, e cai para CPU sozinho caso contrário — sempre mostra no log qual dos dois está sendo usado, além do horário de início/fim e a duração de cada imagem.

---

## 2. Provador virtual (`app/`)

### As duas páginas

| Página | Quando usar | Como monta título/imagem/meta tags |
|---|---|---|
| **`index.php`** | **Produção**, na hospedagem com PHP 8+. É o link oficial que você compartilha. | No **servidor**, em PHP, sem JavaScript — por isso o WhatsApp/Facebook conseguem mostrar a prévia certa (com o nome do produto) ao compartilhar o link, já que essas redes não executam JavaScript ao gerar a prévia. |
| **`visor.html`** | Testes locais rápidos, sem precisar de um servidor PHP (ex: `python -m http.server`). | No **navegador**, via `visor-data.js`, lendo a query string. |

Independente de qual das duas, quem cuida da câmera e da manipulação em realidade aumentada é sempre o **`ar.js`** — ele não lê a URL, só usa o que já está pronto na página.

### Link e parâmetros

```
https://seusite.com.br/app/?produto=example2.png&titulo=Polo%20Preta%20SergioK
```

- `produto` — nome do arquivo PNG dentro de `done/` (ex: `example2.png`)
- `titulo` — nome do produto exibido no topo da página e usado nas mensagens do WhatsApp/compartilhamento (use `%20` para espaços)

### O que a página faz

- Carrega a câmera do celular (frontal por padrão; botão "Câmera" troca para a traseira)
- Sobrepõe a foto do produto (fundo transparente) por cima da câmera
- Arrastar, pinçar (zoom) e girar com dois dedos para ajustar a roupa sobre o corpo; duplo toque redefine a posição
- Botões de zoom +/- e roda do mouse no desktop
- Desliga a câmera automaticamente quando a página vai para segundo plano (ex: ao abrir o WhatsApp) e liga de novo ao voltar
- Botão **Câmera** troca frontal/traseira
- Botão **Chamar** abre o WhatsApp (`5519994714115`, configurável em `WHATSAPP_NUMERO` no topo de `ar.js`) com uma mensagem pré-preenchida citando o produto
- Botão de **compartilhar** usa o menu nativo do celular (`navigator.share`) ou copia o link, se o navegador não suportar
- Favicon e imagem de compartilhamento (Open Graph/Twitter) próprios, em `app/img/`

### Imagem de compartilhamento por produto (`share-image.php`)

No `index.php`, a prévia que aparece ao colar o link no WhatsApp/Facebook/etc. usa a **foto real do produto** compartilhado, colada sobre o mesmo cartão/template de marca (`app/img/share-bg.png`) — em vez de sempre mostrar uma imagem genérica. Isso é feito por [`app/share-image.php`](app/share-image.php), que:

- recebe `?produto=arquivo.png`, valida do mesmo jeito que `index.php` (nome base + extensão permitida + arquivo precisa existir em `done/`)
- usa a extensão **GD** do PHP (praticamente universal em hospedagens PHP) para colar a foto redimensionada dentro do cartão branco do template
- guarda o resultado em `app/img/cache/` (não versionado — veja `.gitignore`), então só gera de verdade na primeira vez que aquele produto é compartilhado
- se o GD não estiver disponível, o produto não existir, ou nada for informado, cai de volta para a imagem genérica `img/og-image.png` — o compartilhamento nunca fica sem imagem

A `visor.html` (sem PHP) continua usando sempre a imagem genérica, já que não tem como gerar essa composição no servidor.

### Requisitos importantes na hospedagem

- **HTTPS obrigatório** para a câmera funcionar (fora de `localhost`, navegadores bloqueiam `getUserMedia` sem conexão segura)
- **Mantenha `app/` e `done/` como pastas irmãs** (mesmo nível) — as duas páginas referenciam as imagens dos produtos em `../done/`
- PHP 8 ou superior para `index.php` (usa `declare(strict_types=1)` e tipagem de parâmetros)
- Extensão **GD** habilitada (para a imagem de compartilhamento por produto) e a pasta `app/img/` com permissão de escrita (para o cache em `app/img/cache/`) — sem isso, a página continua funcionando normalmente, só usa a imagem genérica

### Testando localmente

```bash
python -m http.server 8420
```

Depois abra `http://localhost:8420/app/visor.html?produto=example1.png&titulo=Camila%20Polo%20G` — a câmera funciona em `localhost` mesmo sem HTTPS. Sem um servidor PHP local, `index.php` não pode ser testado dessa forma (só na hospedagem real ou instalando PHP localmente).
