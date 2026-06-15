#!/usr/bin/env python3
"""
Conversor experimental do checkpoint F5-TTS para ONNX.

O F5-TTS nao tem um contrato ONNX estavel no projeto principal. Este script
usa introspeccao para localizar o modulo torch interno da API F5TTS e exporta
esse modulo com nomes de entrada previsiveis para o runtime Lite.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import torch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Exporta checkpoint F5-TTS para ONNX CPU Lite.")
    parser.add_argument("--checkpoint", required=True, help="Checkpoint .pt/.safetensors treinado.")
    parser.add_argument("--vocab", required=True, help="Arquivo vocab.txt usado no treino.")
    parser.add_argument("--output", required=True, help="Arquivo .onnx de saida.")
    parser.add_argument("--opset", type=int, default=17)
    parser.add_argument("--max-text-len", type=int, default=192)
    return parser.parse_args()


def find_torch_module(root: Any) -> torch.nn.Module:
    candidate_names = (
        "ema_model",
        "model",
        "net",
        "transformer",
        "vocoder",
    )
    for name in candidate_names:
        value = getattr(root, name, None)
        if isinstance(value, torch.nn.Module):
            return value

    for value in vars(root).values():
        if isinstance(value, torch.nn.Module):
            return value

    raise RuntimeError(
        "Nao encontrei um torch.nn.Module dentro de F5TTS. "
        "Abra o objeto F5TTS instalado e ajuste find_torch_module para o atributo correto."
    )


def main() -> None:
    args = parse_args()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    from f5_tts.api import F5TTS

    f5 = F5TTS(
        model="F5TTS_v1_Base",
        ckpt_file=args.checkpoint,
        vocab_file=args.vocab,
        device="cpu",
    )
    module = find_torch_module(f5)
    module.eval()

    text_ids = torch.ones((1, args.max_text_len), dtype=torch.long)
    text_lengths = torch.tensor([args.max_text_len], dtype=torch.long)
    ref_text_ids = torch.ones((1, min(96, args.max_text_len)), dtype=torch.long)
    ref_text_lengths = torch.tensor([ref_text_ids.shape[1]], dtype=torch.long)
    speed = torch.tensor([1.0], dtype=torch.float32)
    n_steps = torch.tensor([12], dtype=torch.long)

    torch.onnx.export(
        module,
        (text_ids, text_lengths, ref_text_ids, ref_text_lengths, speed, n_steps),
        str(output),
        input_names=["text_ids", "text_lengths", "ref_text_ids", "ref_text_lengths", "speed", "n_steps"],
        output_names=["audio"],
        dynamic_axes={
            "text_ids": {1: "text_len"},
            "ref_text_ids": {1: "ref_text_len"},
            "audio": {0: "audio_len"},
        },
        opset_version=args.opset,
        do_constant_folding=True,
    )
    print(f"ONNX gerado: {output}")


if __name__ == "__main__":
    main()
