# Coletor Informix + Dashboard no intc01 (Linux)

O banco `db_cra` do UCCX é a fonte real de dados. O driver `informixdb` é nativo e
instala/compila liso no Linux (no Windows dá trabalho por falta de build tools).
Por isso o app e o coletor rodam no **intc01** (`10.3.0.22`, Ubuntu 24.04).

## 1. Pré-requisitos no intc01
```bash
sudo apt update
sudo apt install -y build-essential python3 git curl
# Node LTS (18 ou 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

## 2. Copiar o projeto e instalar
```bash
# copie a pasta web/ para o intc01 (git, scp ou rsync)
cd web
npm install            # informixdb compila aqui sem problema
```

## 3. Conferir as credenciais
O arquivo `.env.local` já contém a conexão do `db_cra`:
```
INFORMIX_HOST=10.3.0.12   INFORMIX_SERVER=uccx01_uccx
INFORMIX_DB=db_cra        INFORMIX_USER=uccxhruser   INFORMIX_PASS=*** (ver .env.local)
```
(o intc01 já está na rede da intcloud, então alcança o 10.3.0.12:1504 direto.)

## 4. PRIMEIRO: explorar o schema
Isso conecta no banco e revela as tabelas/colunas reais — cole a saída de volta
que eu finalizo as queries do coletor:
```bash
node scripts/db-explore.js
```
Pontos que a saída revela:
- se conectou (credenciais OK);
- colunas reais de `RtCSQsSummary` (tempo real: fila, agentes);
- se a `RtCSQsSummary` tem linhas (se estiver vazia = falta habilitar
  "Real-Time Snapshot Writing" no UCCX).

## 5. Rodar o dashboard
```bash
npm run build && npm run start   # http://<intc01>:3000
# ou, em desenvolvimento:
npm run dev
```
A rota `/api/queues/[id]/realtime` já tenta o Informix primeiro
(`lib/informix.ts` → `RtCSQsSummary`) e cai no Finesse se o banco não responder.

## Observações
- O `lib/informix.ts` usa `require` preguiçoso: no Windows (sem o driver) ele
  simplesmente cai no Finesse; no intc01 usa o banco.
- Os nomes de colunas são mapeados de forma tolerante (aliases), mas confirmamos
  os nomes exatos com a saída do passo 4.
- Mantenha `.env.local` fora do git (já está no `.gitignore`).
