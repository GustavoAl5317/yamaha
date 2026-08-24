#!/usr/bin/env bash
# Configura o nginx como proxy HTTPS para o dashboard.
# Uso (no intc01):  sudo bash deploy/setup-nginx.sh
set -e

FQDN="intc01.ind.intcloud.com.br"
CONF_SRC="$(cd "$(dirname "$0")" && pwd)/nginx-yamaha-dash.conf"

echo "==> Instalando nginx (se necessário)"
apt-get update -qq
apt-get install -y nginx

echo "==> Gerando certificado self-signed (válido por 3 anos)"
mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/intc01.crt ]; then
  openssl req -x509 -nodes -days 1095 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/intc01.key \
    -out /etc/nginx/ssl/intc01.crt \
    -subj "/C=BR/ST=SP/L=Sao Paulo/O=Interatell/CN=${FQDN}" \
    -addext "subjectAltName=DNS:${FQDN},IP:10.3.0.22"
  chmod 600 /etc/nginx/ssl/intc01.key
  echo "    certificado criado em /etc/nginx/ssl/"
else
  echo "    certificado já existe — mantido"
fi

echo "==> Publicando a configuração do site"
cp "$CONF_SRC" /etc/nginx/sites-available/yamaha-dash
ln -sf /etc/nginx/sites-available/yamaha-dash /etc/nginx/sites-enabled/yamaha-dash
rm -f /etc/nginx/sites-enabled/default

echo "==> Validando e recarregando"
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Liberando portas no firewall"
ufw allow 80/tcp  || true
ufw allow 443/tcp || true

echo
echo "Pronto: https://${FQDN}/dashboard/help-desk"
echo "Homologação: https://${FQDN}/dashboard/help-desk/homologacao"
