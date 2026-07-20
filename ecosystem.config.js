// PM2 进程管理配置
module.exports = {
  apps: [{
    name: 'data-center',
    script: 'server.js',
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3456,
      ADMIN_PW: '686868'           // 生产环境建议改为强密码
    },
    // 自动重启
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    // 日志
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // 内存限制（超过 256MB 自动重启）
    max_memory_restart: '256M',
    // 优雅关闭
    kill_timeout: 10000,
    listen_timeout: 5000
  }]
};
