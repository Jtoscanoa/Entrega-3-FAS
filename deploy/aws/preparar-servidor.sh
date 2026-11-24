#!/usr/bin/env bash
# Prepara una instancia Ubuntu 24.04 para Mesa 101: Docker + Compose, 1 GB de swap y /opt/mesa101.
set -euo pipefail
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
sudo mkdir -p /opt/mesa101
sudo chown "$USER":"$USER" /opt/mesa101
echo "Listo. Cierra la sesion SSH y vuelve a entrar para usar docker sin sudo."
