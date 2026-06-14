# Migracao SuperVoz F5 para Modal GPU

**Data:** 2026-06-12

## Objetivo

Migrar a inferencia F5-TTS da SuperVoz para um endpoint com GPU, mantendo a extensao do navegador consumindo audio direto por HTTP.

Fluxo desejado:

```text
Extensao Estacio
  -> POST /tts
  -> Endpoint Modal com GPU
  -> F5-TTS + voz warllem
  -> audio/wav direto
  -> navegador toca Blob
```

## Motivo

O Hugging Face Space em CPU Basic funcionou, mas ficou lento para uso real. Tambem foram percebidos estouros/chiados no audio.

Importante: chiados/estouros nao provam, sozinhos, que o problema e a CPU. Possiveis causas:

- audio de referencia com ruido, volume alto ou clipping;
- falta de `ref_text` exato da referencia;
- preprocessamento automatico da referencia pelo F5-TTS;
- parametros baixos de `nfe_step`;
- `speed` alto demais;
- diferenca de vocoder/configuracao;
- checkpoint ou vocab incompatibilizado;
- normalizacao/clipping no WAV final.

Mesmo assim, GPU e o proximo passo pratico porque reduz muito a latencia e permite testar `balanced`/`quality` com `nfe_step` maior sem esperar minutos por frase.

## Plano Modal Starter

Segundo a pagina publica de precos da Modal consultada em 2026-06-12:

- Plano `Starter`: `US$ 0` de assinatura.
- Inclui `US$ 30/month` em creditos gratuitos de compute.
- Permite ate `10` de concorrencia GPU no plano Starter.
- GPU T4 aparece com preco de referencia de `US$ 0.000164/sec`.
- Modal cobra por uso real de compute, nao por recurso ocioso.

Isso nao e GPU gratis ilimitada. E credito mensal de compute. Se o uso passar do credito ou das regras da conta, pode haver cobranca. A documentacao de billing tambem informa que e necessario metodo de pagamento para usar Modal.

## GPU inicial recomendada

Comecar com:

```text
GPU: T4
Modo: fast ou balanced
nfe_step: 16 a 32
```

Se T4 nao ficar boa:

```text
GPU: L4
Modo: balanced
nfe_step: 32
```

Evitar comecar com H100/A100 porque o custo por segundo e maior e nao e necessario para a primeira validacao.

## Arquitetura recomendada

### Opcao A — Extensao chama Modal direto

```text
Extensao -> Modal /tts -> audio/wav
```

Vantagens:

- menor latencia;
- menos uma camada;
- mais simples depois de configurado.

Pontos de atencao:

- configurar CORS no endpoint Modal;
- proteger endpoint com token proprio;
- nao salvar segredo no repositorio.

### Opcao B — Hugging Face Space vira proxy

```text
Extensao -> Hugging Face Space -> Modal -> audio/wav
```

Vantagens:

- a extensao continua usando a mesma URL do Space;
- troca de backend fica invisivel para o navegador.

Pontos de atencao:

- aumenta latencia;
- mantem dois servicos;
- precisa cuidar de timeout entre Space e Modal.

Recomendacao inicial: Opcao A para validar GPU rapidamente. Depois decidir se vale proxy.

## Etapas de implementacao

Status em 2026-06-13: a base de codigo para deploy Modal foi adicionada em `modal_app.py`; ainda depende de conta Modal autenticada, billing/budget configurado e secrets criados fora do repositorio.

Atualizacao em 2026-06-14:

- Deploy ativo em `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- Voz mantida no bucket `https://huggingface.co/buckets/warllem/Voz_Noslen`.
- `requirements-modal.txt` fixa `f5-tts==1.1.9`; `torchcodec` foi removido porque quebrou a inferencia no container CUDA atual.
- `modal_app.py` usa `scaledown_window=60` para evitar cold start entre blocos durante leitura ativa.
- `f5_engine.py` normaliza o WAV final quando o pico passa do limite configurado.
- A extensao usa prefetch sequencial de ate 3 blocos seguintes, sem inferencias paralelas.

1. Criar conta/projeto Modal.
2. Configurar billing/budget baixo para evitar gasto inesperado.
3. Criar secrets no Modal:

```text
HF_TOKEN
API_AUTH_TOKEN
```

Comando sugerido:

```bash
modal secret create supervoz-f5-secrets HF_TOKEN=SEU_HF_TOKEN API_AUTH_TOKEN=SEU_TOKEN_DA_API
```

4. Criar endpoint FastAPI/ASGI Modal com:

```text
GET /health
GET /voices
POST /tts
```

Implementado em:

```text
SuperVoz-F5-Space/modal_app.py
```

5. Reaproveitar a logica atual:

- `voice_manager.py`
- `f5_engine.py`
- `voices.json`

6. Usar volume/cache Modal para:

- checkpoint `model/model_2000.pt`;
- `model/vocab.txt`;
- `data_reference/referencia_voz.wav`;
- cache do vocoder/modelos auxiliares.

7. Carregar o modelo uma vez por container.
8. Testar `POST /tts` com:

```json
{
  "voice": "warllem",
  "text": "Boa noite Warllem, sua voz esta pronta.",
  "speed": 1.0,
  "mode": "balanced",
  "nfe_step": 32
}
```

9. Validar:

- tempo total;
- ausencia de clipping;
- volume RMS/peak;
- estabilidade em frases longas;
- CORS com origem `chrome-extension://...`.

10. Atualizar a extensao para aceitar `TTS API URL` configuravel ou trocar a constante atual.

Status: implementado no popup da extensao como `URL da API SuperVoz`. O valor padrao continua apontando para o Hugging Face Space, e o novo endpoint Modal pode ser colado sem editar `content.js`.

## Comandos de deploy Modal

Depois de configurar conta, billing e secrets:

```bash
cd SuperVoz-F5-Space
modal deploy modal_app.py
```

Para teste temporario antes do deploy persistente:

```bash
cd SuperVoz-F5-Space
modal serve modal_app.py
```

O app usa:

- GPU: `T4`;
- volume: `supervoz-f5-cache`;
- secret: `supervoz-f5-secrets`;
- cache: `/cache`;
- outputs: `/cache/outputs`;
- logs: `/cache/logs`.
- preload no startup: desativado;
- diagnostico remoto no startup: desativado;
- `scaledown_window`: `60` segundos para evitar desligamento durante leitura ativa sem manter GPU ligada por muito tempo.

Para economizar credito, evite usar `Testar conexao` repetidamente. A extensao chama `POST /tts` quando o usuario clica Play com `SuperVoz F5` selecionado e pode pregerar ate 3 blocos seguintes em sequencia. Ao clicar Stop, trocar de rota ou fechar a pagina, a extensao aborta a chamada local; o container Modal encerra apos ficar ocioso.

## Melhorias de audio a testar junto com GPU

Antes de concluir que a GPU resolveu tudo, testar:

- usar `mode=balanced` e `nfe_step=32`;
- reduzir `speed` para `0.95` ou `1.0`;
- normalizar volume final no servidor;
- limitar peak do WAV para evitar clipping;
- publicar um `referencia_voz.txt` com a transcricao exata do audio de referencia;
- testar outra referencia WAV mais limpa, mono, 24 kHz, sem ruido e sem clipping.

## Criterio de sucesso

A migracao para Modal GPU pode ser considerada bem-sucedida quando:

- `/health` responde em menos de 2 segundos com `device: cuda`;
- primeira chamada `/tts` apos cold start carrega o modelo corretamente;
- chamadas seguintes para frases curtas retornam muito mais rapido que CPU Basic;
- audio vem como `audio/wav`;
- extensao toca o Blob sem download manual;
- nao ha estouro/chiado perceptivel em frases curtas de teste.

## Nao fazer nesta etapa

- Nao converter para Piper.
- Nao trocar F5-TTS por outro modelo.
- Nao criar Alexa/Home Assistant.
- Nao remover o Hugging Face Space ainda.
- Nao colocar tokens no codigo.
