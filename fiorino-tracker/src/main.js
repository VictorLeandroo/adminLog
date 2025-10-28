import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import './assets/css/bootstrap.css';
import './assets/css/bootstrap-extended.css';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/css/components.css';
import './assets/css/global.css';
import './assets/css/dark-mode.css';
import '@fortawesome/fontawesome-free/css/all.css';
import currency from './directives/currency';

const app = createApp(App)
app.directive('currency', currency)
app.use(router)
app.use(createPinia())
app.mount('#app')
