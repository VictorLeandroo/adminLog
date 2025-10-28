const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pwa: {
    name: 'Fiorino Tracker',
    themeColor: '#0d6efd',
    manifestOptions: {
      short_name: 'Fiorino',
      start_url: '.',
      display: 'standalone'
    }
  }
})
