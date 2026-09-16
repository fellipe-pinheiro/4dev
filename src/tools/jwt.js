import { decodeBase64Url, bytesToBase64Url } from '../lib/base64url.js';
import { highlightJson, escapeHtml } from '../lib/json-view.js';

const HMAC_HASHES = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

const TIME_CLAIMS = { iat: 'emitido em', nbf: 'válido a partir de', exp: 'expira em', auth_time: 'autenticado em' };

const SAMPLE_TOKEN = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
].join('.');

const ICON = `<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M4.5 7.5l15 9"/><path d="M19.5 7.5l-15 9"/></svg>`;

function parseToken(raw) {
  const token = raw.trim().replace(/^Bearer\s+/i, '');
  if (!token) return { state: 'empty' };

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { state: 'error', message: `Formato inválido: esperado 3 segmentos separados por ponto, encontrado ${parts.length}.` };
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart) {
    return { state: 'error', message: 'Header e payload não podem ser vazios.' };
  }

  try {
    const header = JSON.parse(decodeBase64Url(headerPart));
    const payload = JSON.parse(decodeBase64Url(payloadPart));
    return {
      state: 'ok',
      token,
      header,
      payload,
      signature: signaturePart,
      signingInput: `${headerPart}.${payloadPart}`
    };
  } catch (error) {
    return { state: 'error', message: `Não foi possível decodificar o token: ${error.message}` };
  }
}

function formatEpoch(seconds) {
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return 'data inválida';
  return date.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'medium' });
}

function relativeFromNow(seconds) {
  const deltaSeconds = seconds - Math.floor(Date.now() / 1000);
  const absolute = Math.abs(deltaSeconds);
  const units = [
    ['ano', 31536000],
    ['mês', 2592000],
    ['dia', 86400],
    ['hora', 3600],
    ['minuto', 60],
    ['segundo', 1]
  ];
  const [label, size] = units.find(([, unitSize]) => absolute >= unitSize) ?? units.at(-1);
  const amount = Math.max(1, Math.floor(absolute / size));
  const plural = amount > 1 ? (label === 'mês' ? 'meses' : `${label}s`) : label;
  return deltaSeconds >= 0 ? `em ${amount} ${plural}` : `há ${amount} ${plural}`;
}

function expiryStatus(payload) {
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp <= now) {
    return { tone: 'danger', text: `expirado ${relativeFromNow(payload.exp)}` };
  }
  if (typeof payload.nbf === 'number' && payload.nbf > now) {
    return { tone: 'warn', text: `ainda não válido, ativa ${relativeFromNow(payload.nbf)}` };
  }
  if (typeof payload.exp === 'number') {
    return { tone: 'ok', text: `expira ${relativeFromNow(payload.exp)}` };
  }
  return { tone: 'neutral', text: 'sem claim exp' };
}

const TONE_CLASSES = {
  ok: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  danger: 'bg-red-500/10 text-red-300 ring-red-500/30',
  neutral: 'bg-zinc-500/10 text-zinc-300 ring-zinc-500/30'
};

function badge(tone, text) {
  return `<span class="rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}">${escapeHtml(text)}</span>`;
}

function metaRow(label, value) {
  return `<div class="flex items-baseline gap-2 text-xs"><span class="w-28 shrink-0 text-zinc-500">${escapeHtml(label)}</span><span class="min-w-0 break-all text-zinc-300">${escapeHtml(value)}</span></div>`;
}

function timeClaimRows(payload) {
  const rows = Object.entries(TIME_CLAIMS)
    .filter(([claim]) => typeof payload[claim] === 'number')
    .map(([claim, label]) => metaRow(`${claim} (${label})`, `${formatEpoch(payload[claim])} · ${relativeFromNow(payload[claim])}`));
  if (!rows.length) return '';
  return `<div class="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">${rows.join('')}</div>`;
}

function panelTemplate({ key, title, accent }) {
  return `
    <section class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header class="flex h-10 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900/70 px-3">
        <span class="size-2 rounded-full ${accent}"></span>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-300">${title}</h2>
        <div data-panel-status="${key}" class="ml-auto flex items-center gap-2"></div>
        <button type="button" data-copy="${key}" title="Copiar"
          class="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40" disabled>
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>
        </button>
      </header>
      <div data-panel-body="${key}" class="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed"></div>
    </section>`;
}

function emptyPanel(text) {
  return `<p class="font-sans text-xs text-zinc-600">${escapeHtml(text)}</p>`;
}

async function verifyHmac(algorithm, secret, signingInput, signature) {
  const hash = HMAC_HASHES[algorithm];
  if (!hash) return { tone: 'neutral', text: `verificação de ${algorithm} não suportada aqui` };
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash }, false, ['sign']);
  const computed = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const matches = bytesToBase64Url(new Uint8Array(computed)) === signature;
  return matches
    ? { tone: 'ok', text: 'assinatura válida' }
    : { tone: 'danger', text: 'assinatura inválida' };
}

export const jwtTool = {
  id: 'jwt',
  name: 'JWT',
  label: 'Decode de JSON Web Token',
  icon: ICON,

  mount(container) {
    container.innerHTML = `
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 px-4">
        <h1 class="text-sm font-semibold tracking-tight">JWT Decoder</h1>
        <div id="jwt-status" class="flex items-center gap-2"></div>
        <div class="ml-auto flex items-center gap-2">
          <button type="button" id="jwt-paste" class="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">Colar</button>
          <button type="button" id="jwt-sample" class="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">Exemplo</button>
          <button type="button" id="jwt-clear" class="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">Limpar</button>
        </div>
      </header>
      <div class="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(320px,36%)_1fr]">
        <section class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
          <header class="flex h-10 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900/70 px-3">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-300">Token</h2>
            <span id="jwt-length" class="ml-auto text-[11px] text-zinc-500"></span>
          </header>
          <textarea id="jwt-input" spellcheck="false" autocomplete="off"
            placeholder="Cole aqui o JWT (aceita o prefixo Bearer)"
            class="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[12.5px] leading-relaxed text-emerald-200 outline-none placeholder:font-sans placeholder:text-zinc-600"></textarea>
          <div class="shrink-0 space-y-2 border-t border-zinc-800 p-3">
            <label for="jwt-secret" class="block text-[11px] uppercase tracking-wider text-zinc-500">Secret (HS256/384/512)</label>
            <input id="jwt-secret" type="text" spellcheck="false" autocomplete="off" placeholder="opcional — verifica a assinatura"
              class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-600/60 placeholder:font-sans placeholder:text-zinc-600">
          </div>
        </section>
        <div class="grid min-h-0 grid-rows-3 gap-3">
          ${panelTemplate({ key: 'header', title: 'Header', accent: 'bg-sky-400' })}
          ${panelTemplate({ key: 'payload', title: 'Payload', accent: 'bg-violet-400' })}
          ${panelTemplate({ key: 'signature', title: 'Signature', accent: 'bg-amber-400' })}
        </div>
      </div>`;

    const input = container.querySelector('#jwt-input');
    const secretInput = container.querySelector('#jwt-secret');
    const statusSlot = container.querySelector('#jwt-status');
    const lengthSlot = container.querySelector('#jwt-length');
    const bodies = {
      header: container.querySelector('[data-panel-body="header"]'),
      payload: container.querySelector('[data-panel-body="payload"]'),
      signature: container.querySelector('[data-panel-body="signature"]')
    };
    const statuses = {
      header: container.querySelector('[data-panel-status="header"]'),
      payload: container.querySelector('[data-panel-status="payload"]'),
      signature: container.querySelector('[data-panel-status="signature"]')
    };
    const copyTargets = { header: '', payload: '', signature: '' };

    const setCopyEnabled = () => {
      for (const button of container.querySelectorAll('[data-copy]')) {
        button.disabled = !copyTargets[button.dataset.copy];
      }
    };

    const renderSignature = (result, verification) => {
      const algorithm = result.header.alg ?? 'desconhecido';
      const isUnsigned = algorithm === 'none' || !result.signature;
      statuses.signature.innerHTML = verification
        ? badge(verification.tone, verification.text)
        : badge(isUnsigned ? 'danger' : 'neutral', isUnsigned ? 'sem assinatura' : 'não verificada');
      bodies.signature.innerHTML = `
        <div class="space-y-1.5 font-sans">
          ${metaRow('algoritmo', algorithm)}
          ${metaRow('tipo', result.header.typ ?? '—')}
          ${metaRow('key id (kid)', result.header.kid ?? '—')}
          ${metaRow('tamanho', `${result.signature.length} caracteres base64url`)}
        </div>
        <pre class="mt-3 border-t border-zinc-800 pt-3 break-all whitespace-pre-wrap text-amber-200">${escapeHtml(result.signature || '—')}</pre>
        <p class="mt-3 font-sans text-[11px] leading-relaxed text-zinc-500">${
          HMAC_HASHES[algorithm]
            ? 'Informe o secret no painel à esquerda para verificar a assinatura.'
            : 'Verificação local disponível apenas para algoritmos HMAC (HS256/384/512).'
        }</p>`;
      copyTargets.signature = result.signature;
      setCopyEnabled();
    };

    const runVerification = async result => {
      const secret = secretInput.value;
      if (!secret) {
        renderSignature(result, null);
        return;
      }
      try {
        const verification = await verifyHmac(result.header.alg, secret, result.signingInput, result.signature);
        renderSignature(result, verification);
      } catch (error) {
        renderSignature(result, { tone: 'danger', text: `erro: ${error.message}` });
      }
    };

    const render = () => {
      const result = parseToken(input.value);
      lengthSlot.textContent = input.value.trim() ? `${input.value.trim().length} caracteres` : '';

      if (result.state !== 'ok') {
        const message = result.state === 'empty' ? 'Aguardando token' : result.message;
        statusSlot.innerHTML = result.state === 'empty' ? '' : badge('danger', 'token inválido');
        for (const key of Object.keys(bodies)) {
          statuses[key].innerHTML = '';
          bodies[key].innerHTML = emptyPanel(message);
          copyTargets[key] = '';
        }
        setCopyEnabled();
        return;
      }

      const expiry = expiryStatus(result.payload);
      statusSlot.innerHTML = `${badge('ok', 'estrutura válida')}${badge(expiry.tone, expiry.text)}`;

      statuses.header.innerHTML = badge('neutral', `${Object.keys(result.header).length} campos`);
      bodies.header.innerHTML = `<pre class="whitespace-pre-wrap break-all">${highlightJson(result.header)}</pre>`;
      copyTargets.header = JSON.stringify(result.header, null, 2);

      statuses.payload.innerHTML = `${badge('neutral', `${Object.keys(result.payload).length} claims`)}${badge(expiry.tone, expiry.text)}`;
      bodies.payload.innerHTML = `<pre class="whitespace-pre-wrap break-all">${highlightJson(result.payload)}</pre>${timeClaimRows(result.payload)}`;
      copyTargets.payload = JSON.stringify(result.payload, null, 2);

      setCopyEnabled();
      runVerification(result);
    };

    input.addEventListener('input', render);
    secretInput.addEventListener('input', render);

    container.querySelector('#jwt-sample').addEventListener('click', () => {
      input.value = SAMPLE_TOKEN;
      secretInput.value = 'your-256-bit-secret';
      render();
      input.focus();
    });

    container.querySelector('#jwt-clear').addEventListener('click', () => {
      input.value = '';
      secretInput.value = '';
      render();
      input.focus();
    });

    container.querySelector('#jwt-paste').addEventListener('click', async () => {
      try {
        input.value = await navigator.clipboard.readText();
        render();
      } catch {
        input.focus();
      }
    });

    container.addEventListener('click', async event => {
      const button = event.target.closest('[data-copy]');
      if (!button) return;
      const text = copyTargets[button.dataset.copy];
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        button.classList.add('text-emerald-400');
        setTimeout(() => button.classList.remove('text-emerald-400'), 900);
      } catch {
        button.classList.add('text-red-400');
        setTimeout(() => button.classList.remove('text-red-400'), 900);
      }
    });

    render();
    input.focus();
  }
};
