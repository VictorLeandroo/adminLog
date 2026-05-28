import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView.vue'
import DashboardView from '../views/dashboard/PanelView.vue'
import RoutesView from '@/views/routes/RoutesView.vue'
import FinancialView from '@/views/financial/FinancialView.vue'
import VehiclesView from '@/views/vehicles/VehiclesView.vue'
import UsersView from '@/views/users/UsersView.vue'
import ProfileView from '@/views/profile/ProfileView.vue'

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/dashboard', name: 'Dashboard', component: DashboardView },
    { path: '/rotas', name: 'Rotas', component: RoutesView, meta: { roles: ['ADMIN', 'DRIVER'] } },
    { path: '/financial', name: 'Financial', component: FinancialView, meta: { roles: ['ADMIN', 'DRIVER', 'FINANCE'] } },
    { path: '/vehicles', name: 'Vehicles', component: VehiclesView, meta: { roles: ['ADMIN', 'FINANCE'] } },
    { path: '/profile', name: 'Profile', component: ProfileView },
    { path: '/users', name: 'Users', component: UsersView, meta: { adminOnly: true } },
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
        next('/dashboard')
        return
    }

    const profileType = localStorage.getItem('profileType') || 'driver'

    if (to.meta.adminOnly && (user?.role !== 'ADMIN' || profileType !== 'admin')) {
        next('/dashboard')
        return
    }

    if (to.meta.roles && !to.meta.roles.includes(user?.role)) {
        next('/dashboard')
        return
    }

    next()
})

export default router
