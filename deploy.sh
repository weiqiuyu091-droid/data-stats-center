#!/bin/bash
# ============================================
#  数据统计中心 — 一键部署脚本
#  适用于: Ubuntu 20.04+ / CentOS 7+
#  用法: chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

PROJECT_DIR="/opt/data-center"
DATA_DIR="/data/shuju"
NODE_VERSION="18"
GIT_REPO="git@github.com:weiqiuyu091-droid/data-stats-center.git"

echo "===== 1. 检查系统环境 ====="

# 检测包管理器
if command -v apt &>/dev/null; then
    PM="apt"
elif command -v yum &>/dev/null; then
    PM="yum"
else
    echo "不支持的系统，仅支持 Ubuntu/Debian/CentOS"
    exit 1
fi

# ---- 安装 Node.js 18 ----
if ! command -v node &>/dev/null; then
    echo "安装 Node.js $NODE_VERSION..."
    if [ "$PM" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo -E bash -
        sudo yum install -y nodejs
    fi
else
    echo "Node.js 已安装: $(node -v)"
fi

# ---- 安装 PM2 ----
if ! command -v pm2 &>/dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
else
    echo "PM2 已安装: $(pm2 -v)"
fi

# ---- 安装 Git ----
if [ "$PM" = "apt" ]; then
    sudo apt install -y git
else
    sudo yum install -y git
fi

echo ""
echo "===== 2. 克隆项目 ====="

if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull
else
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown "$USER":"$USER" "$PROJECT_DIR"
    git clone "$GIT_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo ""
echo "===== 3. 安装依赖 ====="
npm install --production

echo ""
echo "===== 4. 创建数据目录 ====="
sudo mkdir -p "$DATA_DIR"
sudo chown "$USER":"$USER" "$DATA_DIR"
mkdir -p "$PROJECT_DIR/logs"

echo ""
echo "===== 5. 配置自启动 ====="

# 停止旧实例（如果有）
pm2 delete data-center 2>/dev/null || true

# 启动新实例
DATA_DIR="$DATA_DIR" pm2 start ecosystem.config.js

# 保存 PM2 进程列表，开机自启
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || \
pm2 startup | tail -1 | bash

echo ""
echo "===== 6. 防火墙配置 ====="
if command -v ufw &>/dev/null; then
    sudo ufw allow 3456/tcp 2>/dev/null || true
elif command -v firewall-cmd &>/dev/null; then
    sudo firewall-cmd --permanent --add-port=3456/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "  服务地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3456"
echo "  管理后台: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3456/admin"
echo ""
echo "  常用命令:"
echo "    pm2 status          — 查看运行状态"
echo "    pm2 logs data-center — 查看日志"
echo "    pm2 restart data-center — 重启服务"
echo "    ./deploy.sh         — 更新部署"
echo "========================================"
