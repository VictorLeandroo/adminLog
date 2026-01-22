import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView.vue'
import DashboardView from '../views/dashboard/PanelView.vue'
import RoutesView from '@/views/routes/RoutesView.vue'
import FinancialView from '@/views/financial/FinancialView.vue'
import VehiclesView from '@/views/vehicles/VehiclesView.vue'

const routes = [
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/dashboard', name: 'Dashboard', component: DashboardView },
    { path: '/rotas', name: 'Rotas', component: RoutesView },
    { path: '/financial', name: 'Financial', component: FinancialView },
    { path: '/vehicles', name: 'Vehicles', component: VehiclesView },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
