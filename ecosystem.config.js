module.exports = {
  apps: [
    {
      name: 'carsave-backend', // 应用名称
      script: './dist/main.js', // 主程序入口文件
      cwd: './', // 应用的当前工作目录 (相对于 ecosystem 文件)
      instances: 'max', // 启动的实例数量，'max' 表示根据 CPU 核心数启动尽可能多的实例
      exec_mode: 'cluster', // 执行模式，'cluster' 或 'fork'
      autorestart: true, // 应用崩溃后自动重启
      watch: false, // 是否监听文件变化并自动重启 (生产环境通常设为 false)
      max_memory_restart: '1G', // 当应用达到指定内存限制时自动重启
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z', // 日志日期格式

      // 生产环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005, // 确保与 .env.production 和 Nginx 配置一致
        // 在这里可以添加或覆盖 .env.production 中的其他变量，如果需要的话
        // 例如: DB_HOST: 'another_prod_db_host' (通常不推荐覆盖 .env 文件中的核心配置)
      },

      // 开发环境变量 (可选, 如果也用 PM2 管理开发实例)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000, // 开发时使用的端口
        // WATCH_MODE_ENTRIES: './src', // 如果开启 watch，可以指定监听的目录
      },

      // 日志文件路径 (PM2 会自动管理这些日志)
      // 您也可以在 ~/.pm2/pm2.log 和 ~/.pm2/logs/ 中找到它们
      out_file: './logs/pm2-out.log', // 标准输出日志
      error_file: './logs/pm2-error.log', // 标准错误日志
      merge_logs: true, // 集群模式下合并所有实例的日志到一个文件
      // combine_logs: true, // (旧版 PM2 选项，merge_logs 更常用)
    },
  ],

  // 部署相关的配置 (可选, 如果您使用 PM2 的部署功能)
  // deploy : {
  //   production : {
  //     user : 'node_user',
  //     host : 'your_server_ip',
  //     ref  : 'origin/main', // 或者您的生产分支
  //     repo : 'git@example.com:user/repo.git',
  //     path : '/var/www/production',
  //     'post-deploy' : 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
  //   }
  // }
}; 