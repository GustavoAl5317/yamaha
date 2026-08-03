#!/usr/bin/env bash
# Inicia o dashboard no intc01 com o ambiente do driver Informix configurado.
# Uso: bash start.sh          (produção: build + start)
#      bash start.sh dev      (desenvolvimento)
set -e
cd "$(dirname "$0")"

DRV="$PWD/node_modules/informixdb/installer/onedb-odbc-driver"
if [ -d "$DRV" ]; then
  export INFORMIXDIR="$DRV"
  export LD_LIBRARY_PATH="$(find "$DRV" -name '*.so*' -printf '%h\n' | sort -u | tr '\n' ':')$LD_LIBRARY_PATH"
  echo "Informix env OK (INFORMIXDIR=$INFORMIXDIR)"
else
  echo "AVISO: driver informixdb não encontrado — rode 'npm install' primeiro."
fi

if [ "$1" = "dev" ]; then
  exec npm run dev -- -H 0.0.0.0
elif [ "$1" = "prod" ]; then
  exec npm run start -- -H 0.0.0.0
else
  npm run build
  exec npm run start -- -H 0.0.0.0
fi
