<template>
    <nav class="main app-shell-header" id="header">
        <div class="primary">
            <div class="brand-mark">
                <img src="@/assets/img/logo.png" alt="Fiorino Tracker" class="logo">
                <div>
                    <strong>Fiorino Tracker</strong>
                    <small>{{ profileLabel }}</small>
                </div>
            </div>

            <div class="header-actions">
                <button class="icon-action" @click="toggleTheme" :aria-label="isDark ? 'Ativar modo claro' : 'Ativar modo escuro'">
                    <i class="fa-solid" :class="isDark ? 'fa-sun' : 'fa-moon'"></i>
                </button>

                <div class="user-info position-relative" @click="dropdownOpen = !dropdownOpen">
                    <div class="user-copy">
                        <h6>{{ userName }}</h6>
                        <small>{{ profileLabel }}</small>
                    </div>
                    <img :src="avatarSrc" alt="avatar" class="avatar">

                    <div class="dropdown-menu-header" v-if="dropdownOpen" @click.stop>
                        <router-link class="dropdown-item-h" to="/profile" @click="dropdownOpen = false">
                            <i class="fa-solid fa-user"></i>
                            Meu perfil
                        </router-link>
                        <button class="dropdown-item-h danger" @click="logout">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i>
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="sub">
            <router-link v-for="item in navLinks" :key="item.to" class="link" :to="item.to"
                :class="{ 'link-selected': currentPage.includes(item.match) }">
                <i class="fa-solid" :class="item.icon"></i>
                <span>{{ item.label }}</span>
            </router-link>
        </div>
    </nav>
</template>

<script>
import '@/assets/css/components/HeaderComp.css'

export default {
    name: 'HeaderComp',

    data() {
        const user = JSON.parse(localStorage.getItem('user') || 'null') || {}

        return {
            userName: user.name || '',
            userAvatar: user.photoUrl || '',
            userRole: user.role || 'DRIVER',
            dropdownOpen: false,
            profileType: this.profileFromRole(user.role),
            isDark: localStorage.getItem('theme') === 'dark'
        }
    },

    computed: {
        currentPage() {
            return this.$route.name?.toLowerCase() || this.$route.path?.toLowerCase()
        },
        profileLabel() {
            if (this.userRole === 'DRIVER') return 'Operação em campo'
            if (this.userRole === 'FINANCE') return 'Painel financeiro'
            return 'Painel administrativo'
        },
        navLinks() {
            if (this.userRole === 'DRIVER') {
                return [
                    { to: '/rotas', match: 'rotas', icon: 'fa-route', label: 'Rotas' },
                    { to: '/financial', match: 'financial', icon: 'fa-receipt', label: 'Gastos' },
                    { to: '/vehicles', match: 'vehicles', icon: 'fa-van-shuttle', label: 'Veículo' },
                    { to: '/profile', match: 'profile', icon: 'fa-user', label: 'Perfil' }
                ]
            }

            if (this.userRole === 'FINANCE') {
                return [
                    { to: '/dashboard', match: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
                    { to: '/financial', match: 'financial', icon: 'fa-wallet', label: 'Financeiro' },
                    { to: '/vehicles', match: 'vehicles', icon: 'fa-van-shuttle', label: 'Frota' },
                    { to: '/profile', match: 'profile', icon: 'fa-user', label: 'Perfil' }
                ]
            }

            return [
                { to: '/dashboard', match: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
                { to: '/rotas', match: 'rotas', icon: 'fa-route', label: 'Rotas' },
                { to: '/financial', match: 'financial', icon: 'fa-wallet', label: 'Financeiro' },
                { to: '/vehicles', match: 'vehicles', icon: 'fa-van-shuttle', label: 'Frota' },
                { to: '/users', match: 'users', icon: 'fa-users', label: 'Motoristas' },
                { to: '/profile', match: 'profile', icon: 'fa-user', label: 'Perfil' }
            ]
        },
        avatarSrc() {
            return this.userAvatar || require('@/assets/img/avatar.jpg')
        }
    },

    mounted() {
        const user = JSON.parse(localStorage.getItem('user') || 'null')
        this.userName = user?.name || 'Usuário'
        this.userAvatar = user?.photoUrl || ''
        this.userRole = user?.role || this.userRole
        this.profileType = this.profileFromRole(this.userRole)
        localStorage.setItem('profileType', this.profileType)
        this.applyTheme()
        window.addEventListener('profile-updated', this.syncProfile)
        window.addEventListener('profile-saved', this.syncProfile)
    },

    beforeUnmount() {
        window.removeEventListener('profile-updated', this.syncProfile)
        window.removeEventListener('profile-saved', this.syncProfile)
    },

    methods: {
        profileFromRole(role) {
            if (role === 'ADMIN') return 'admin'
            if (role === 'FINANCE') return 'finance'
            return 'driver'
        },

        syncProfile(event) {
            const user = JSON.parse(localStorage.getItem('user') || 'null')
            this.userName = user?.name || 'Usuário'
            this.userAvatar = user?.photoUrl || ''
            this.userRole = user?.role || this.userRole
            this.profileType = event.detail || this.profileFromRole(this.userRole)
        },

        toggleTheme() {
            this.isDark = !this.isDark
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
            this.applyTheme()
        },

        applyTheme() {
            document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light')
        },

        logout() {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('profileType')
            localStorage.removeItem('profilePhoto')
            localStorage.removeItem('profileName')
            this.$router.push('/login')
        }
    }
}
</script>