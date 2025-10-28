import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView.vue'
import DashboardView from '../views/dashboard/PanelView.vue'
import RoutesView from '@/views/routes/RoutesView.vue'

const routes = [
    { path: '/', name: 'Login', component: LoginView },
    { path: '/dashboard', name: 'Dashboard', component: DashboardView },
    { path: '/rotas', name: 'Rotas', component: RoutesView }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
