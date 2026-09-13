"""
Remove o fundo de imagens de roupas usando rembg e salva PNGs com fundo
transparente. Usa GPU (CUDA) quando disponivel, com fallback automatico
para CPU. Imagens processadas com sucesso sao movidas da pasta de entrada
para a pasta de sucesso, para nao serem reprocessadas na proxima execucao.

Uso (CMD ou PowerShell):
    python remove_bg.py
    python remove_bg.py --input examples --output done --success success
    python remove_bg.py --input "C:\caminho\fotos" --output "C:\caminho\saida"
    python remove_bg.py --cpu               (forca uso de CPU)
    python remove_bg.py --model u2net       (usa um modelo mais leve/rapido)

Para acelerar com GPU NVIDIA, instale o onnxruntime com suporte a CUDA:
    pip uninstall -y onnxruntime
    pip install onnxruntime-gpu
Isso exige os runtimes CUDA/cuDNN compativeis instalados no sistema; sem
eles, o script detecta a falha e cai automaticamente para CPU.
"""

import argparse
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

FORMATO_HORARIO = "%Y-%m-%d %H:%M:%S"

EXTENSOES_VALIDAS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def criar_sessao(model_name: str, usar_cpu: bool):
    from rembg import new_session

    if usar_cpu:
        providers = ["CPUExecutionProvider"]
    else:
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

    sessao = new_session(model_name, providers=providers)
    providers_ativos = sessao.inner_session.get_providers()

    if not usar_cpu:
        if "CUDAExecutionProvider" in providers_ativos:
            print("GPU (CUDA) detectada e em uso.")
        else:
            print(
                "Aviso: GPU solicitada mas indisponivel (driver/CUDA/cuDNN "
                "ausentes ou incompativeis). Usando CPU."
            )
    print(f"Providers ativos: {providers_ativos}")
    return sessao


def processar_pasta(
    pasta_entrada: Path,
    pasta_saida: Path,
    pasta_sucesso: Path,
    model_name: str,
    usar_cpu: bool,
) -> None:
    from rembg import remove

    if not pasta_entrada.is_dir():
        print(f"Erro: pasta de entrada nao encontrada: {pasta_entrada}")
        sys.exit(1)

    imagens = sorted(
        p for p in pasta_entrada.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSOES_VALIDAS
    )

    if not imagens:
        print(f"Nenhuma imagem encontrada em {pasta_entrada}")
        return

    pasta_saida.mkdir(parents=True, exist_ok=True)
    pasta_sucesso.mkdir(parents=True, exist_ok=True)
    print(f"Pasta de entrada (caminho real): {pasta_entrada.resolve()}")
    print(f"Pasta de saida (caminho real):   {pasta_saida.resolve()}")
    print(f"Pasta de sucesso (caminho real): {pasta_sucesso.resolve()}")
    print(f"Modelo: {model_name}")

    sessao = criar_sessao(model_name, usar_cpu)

    total = len(imagens)
    inicio_total = time.perf_counter()
    print(f"Inicio: {datetime.now().strftime(FORMATO_HORARIO)}")

    for i, caminho in enumerate(imagens, start=1):
        destino = pasta_saida / f"{caminho.stem}.png"
        inicio_img = time.perf_counter()
        print(f"[{i}/{total}] Processando {caminho.name} -> {destino.name} "
              f"(inicio: {datetime.now().strftime(FORMATO_HORARIO)})")
        with open(caminho, "rb") as f:
            entrada = f.read()
        saida = remove(entrada, session=sessao)
        with open(destino, "wb") as f:
            f.write(saida)
            f.flush()
        duracao_img = time.perf_counter() - inicio_img
        if destino.exists():
            print(f"    OK: gravado ({destino.stat().st_size} bytes) "
                  f"em {duracao_img:.2f}s "
                  f"(termino: {datetime.now().strftime(FORMATO_HORARIO)})")

            destino_sucesso = pasta_sucesso / caminho.name
            if destino_sucesso.exists():
                destino_sucesso = (
                    pasta_sucesso / f"{caminho.stem}_{int(time.time())}{caminho.suffix}"
                )
            shutil.move(str(caminho), str(destino_sucesso))
            print(f"    Movido para: {destino_sucesso.resolve()}")
        else:
            print(f"    FALHA: arquivo nao encontrado apos gravacao em {destino.resolve()} "
                  f"(apos {duracao_img:.2f}s). Original mantido em {caminho.resolve()} "
                  f"para nova tentativa.")

    duracao_total = time.perf_counter() - inicio_total
    print(f"\nTermino: {datetime.now().strftime(FORMATO_HORARIO)}")
    print(f"Tempo total: {duracao_total:.2f}s")
    print(f"Concluido. {total} imagem(ns) salvas em {pasta_saida.resolve()}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove o fundo de fotos de roupas usando rembg."
    )
    parser.add_argument(
        "--input", "-i", default="examples",
        help="Pasta com as imagens de entrada (padrao: examples)",
    )
    parser.add_argument(
        "--output", "-o", default="done",
        help="Pasta onde salvar os PNGs com fundo transparente (padrao: done)",
    )
    parser.add_argument(
        "--success", "-s", default="success",
        help="Pasta para onde mover as imagens originais processadas com "
             "sucesso, para nao serem pegas de novo (padrao: success)",
    )
    parser.add_argument(
        "--model", "-m", default="u2net",
        help="Modelo do rembg a usar (padrao: u2net, rapido em CPU). "
             "Mais pesado/preciso: bria-rmbg. Mais leve ainda: u2netp.",
    )
    parser.add_argument(
        "--cpu", action="store_true",
        help="Forca o uso de CPU, ignorando a GPU mesmo se disponivel.",
    )
    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    pasta_entrada = Path(args.input)
    pasta_saida = Path(args.output)
    pasta_sucesso = Path(args.success)
    if not pasta_entrada.is_absolute():
        pasta_entrada = base / pasta_entrada
    if not pasta_saida.is_absolute():
        pasta_saida = base / pasta_saida
    if not pasta_sucesso.is_absolute():
        pasta_sucesso = base / pasta_sucesso

    processar_pasta(pasta_entrada, pasta_saida, pasta_sucesso, args.model, args.cpu)


if __name__ == "__main__":
    main()
