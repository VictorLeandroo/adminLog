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
                        <small>{{ profileType === 'driver' ? 'Motorista' : 'Administração' }}</small>
                    </div>
                    <img :src="avatarSrc" alt="avatar" class="avatar">

                    <div class="dropdown-menu-header" v-if="dropdownOpen" @click.stop>
                        <button class="dropdown-item-h" @click="setProfile('driver')">
                            <i class="fa-solid fa-truck-fast"></i>
                            Modo motorista
                        </button>
                        <button v-if="userRole === 'ADMIN'" class="dropdown-item-h" @click="setProfile('admin')">
                            <i class="fa-solid fa-user-shield"></i>
                            Modo administração
                        </button>
                        <button class="dropdown-item-h danger" @click="logout">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i>
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="sub">
            <router-link class="link" to="/dashboard" :class="{ 'link-selected': currentPage.includes('dashboard') }">
                <i class="fa-solid fa-chart-line"></i>
                <span>Início</span>
            </router-link>
            <router-link class="link" to="/rotas" :class="{ 'link-selected': currentPage.includes('rotas') }">
                <i class="fa-solid fa-route"></i>
                <span>Rotas</span>
            </router-link>
            <router-link class="link" to="/financial" :class="{ 'link-selected': currentPage.includes('financial') }">
                <i class="fa-solid fa-wallet"></i>
                <span>Financeiro</span>
            </router-link>
            <router-link class="link" to="/vehicles" :class="{ 'link-selected': currentPage.includes('vehicles') }">
                <i class="fa-solid fa-van-shuttle"></i>
                <span>Veículo</span>
            </router-link>
            <router-link class="link" to="/profile" :class="{ 'link-selected': currentPage.includes('profile') }">
                <i class="fa-solid fa-user"></i>
                <span>Perfil</span>
            </router-link>
            <router-link v-if="canAccessAdminPages" class="link" to="/users" :class="{ 'link-selected': currentPage.includes('users') }">
                <i class="fa-solid fa-users"></i>
                <span>Usuários</span>
            </router-link>
        </div>
    </nav>
</template>

<script>
import '@/assets/css/components/HeaderComp.css'

export default {
    name: 'HeaderComp',

    data() {
        return {
            userName: '',
            userAvatar: JSON.parse(localStorage.getItem('user') || 'null')?.photoUrl || '',
            userRole: JSON.parse(localStorage.getItem('user') || 'null')?.role || 'DRIVER',
            dropdownOpen: false,
            profileType: localStorage.getItem('profileType') || 'driver',
            isDark: localStorage.getItem('theme') === 'dark'
        }
    },

    computed: {
        currentPage() {
            return this.$route.name?.toLowerCase() || this.$route.path?.toLowerCase();
        },
        profileLabel() {
            return this.profileType === 'driver' ? 'Operação em campo' : 'Painel administrativo'
        },
        canAccessAdminPages() {
            return this.userRole === 'ADMIN' && this.profileType === 'admin'
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
        this.applyTheme()
        window.addEventListener('profile-updated', this.syncProfile)
        window.addEventListener('profile-saved', this.syncProfile)
    },

    beforeUnmount() {
        window.removeEventListener('profile-updated', this.syncProfile)
        window.removeEventListener('profile-saved', this.syncProfile)
    },

    methods: {
        setProfile(profile) {
            if (profile === 'admin' && this.userRole !== 'ADMIN') return
            this.profileType = profile
            localStorage.setItem('profileType', profile)
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: profile }))
            this.dropdownOpen = false

            if (profile === 'driver' && this.$route.meta?.adminOnly) {
                this.$router.push('/dashboard')
            }
        },

        syncProfile(event) {
            this.profileType = event.detail || localStorage.getItem('profileType') || 'driver'
            const user = JSON.parse(localStorage.getItem('user') || 'null')
            this.userName = user?.name || 'Usuário'
            this.userAvatar = user?.photoUrl || ''
            this.userRole = user?.role || this.userRole
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
            localStorage.removeItem('profilePhoto')
            localStorage.removeItem('profileName')
            this.$router.push('/login')
        }
    }
}
</script>
