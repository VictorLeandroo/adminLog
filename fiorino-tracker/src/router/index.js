import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView.vue'
import DashboardView from '../views/dashboard/PanelView.vue'
import RoutesView from '@/views/routes/RoutesView.vue'
import FinancialView from '@/views/financial/FinancialView.vue'
import VehiclesView from '@/views/vehicles/VehiclesView.vue'
import UsersView from '@/views/users/UsersView.vue'
import ProfileView from '@/views/profile/ProfileView.vue'

function homeForRole(role) {
    if (role === 'DRIVER') return '/rotas'
    if (role === 'FINANCE') return '/financial'
    return '/dashboard'
}

const routes = [
    { path: '/', redirect: () => homeForRole(JSON.parse(localStorage.getItem('user') || 'null')?.role) },
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/dashboard', name: 'Dashboard', component: DashboardView, meta: { roles: ['ADMIN', 'FINANCE'] } },
    { path: '/rotas', name: 'Rotas', component: RoutesView, meta: { roles: ['ADMIN', 'DRIVER'] } },
    { path: '/financial', name: 'Financial', component: FinancialView, meta: { roles: ['ADMIN', 'DRIVER', 'FINANCE'] } },
    { path: '/vehicles', name: 'Vehicles', component: VehiclesView, meta: { roles: ['ADMIN', 'DRIVER', 'FINANCE'] } },
    { path: '/profile', name: 'Profile', component: ProfileView },
    { path: '/users', name: 'Users', component: UsersView, meta: { roles: ['ADMIN'] } },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, _from, next) => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || 'null')

    if (to.path !== '/login' && !token) {
        next('/login')
        return
    }

    if (to.path === '/login' && token) {
        next(homeForRole(user?.role))
        return
    }

    if (to.meta.roles && !to.meta.roles.includes(user?.role)) {
        next(homeForRole(user?.role))
        return
    }

    next()
})

export default router