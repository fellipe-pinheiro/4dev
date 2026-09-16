# 4dev

Ferramentas de uso diário para desenvolvedores, rodando 100% no navegador. Nenhum dado é
enviado para servidor: todo processamento acontece na aba aberta.

## Ferramentas

| Ferramenta | Rota | O que faz |
|---|---|---|
| JWT | `#/jwt` | Decodifica header, payload e signature de um JSON Web Token e verifica assinaturas HMAC (HS256/384/512) com um secret local |

## Como rodar

Não há build nem dependências para instalar. Basta servir a pasta:

```bash
python3 -m http.server 8080
```

E abrir <http://localhost:8080>.

Abrir o `index.html` direto pelo `file://` não funciona, porque os módulos ES exigem
origem HTTP.

## Stack

- HTML + JavaScript (módulos ES nativos), sem bundler
- Tailwind CSS via CDN (`@tailwindcss/browser`)
- Web Crypto API para verificação de assinatura

## Estrutura

```
index.html          shell da aplicação (menu retrátil + área da ferramenta)
src/app.js          registro de ferramentas, roteamento por hash, estado do menu
src/tools/jwt.js    ferramenta de decode de JWT
src/lib/            utilitários compartilhados (base64url, render de JSON)
```

## Adicionando uma ferramenta

1. Crie `src/tools/<nome>.js` exportando um objeto com `id`, `name`, `label`, `icon` e
   `mount(container)`.
2. Importe e adicione esse objeto ao array `tools` em `src/app.js`.

O menu lateral e a rota `#/<id>` passam a funcionar automaticamente.

## Deploy

Por ser estático, pode ser publicado no GitHub Pages apontando para a branch principal na
raiz do projeto.
