module.exports = {
  apps: [
    {
      name: 'nexusforge',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=nexusforge-production --local --ip 0.0.0.0 --port 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        OPENAI_API_KEY: 'lVRqMuPaGWvUI3K2YAnL4BM7Vl8U9DK9',
        OPENAI_BASE_URL: 'https://www.genspark.ai/api/llm_proxy/v1'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
