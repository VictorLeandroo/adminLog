const productionOrigin = 'https://jfv-transportes.vercel.app'
const apiTarget = process.env.VUE_APP_PROXY_TARGET || 'https://adminlog-1.onrender.com'

module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: productionOrigin,
          Referer: `${productionOrigin}/`
        }
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: productionOrigin,
          Referer: `${productionOrigin}/`
        }
      }
    }
  }
}
