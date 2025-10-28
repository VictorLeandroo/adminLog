<template>
    <nav class="main" id="header">
        <div class="primary">
            <img src="@/assets/img/logo.png" alt="logo" class="logo">

            <div class="user-info position-relative" @click="() => { dropdownOpen = !dropdownOpen }">
                <h6>{{ userName }}</h6>
                <img src="@/assets/img/avatar.jpg" alt="logo" class="avatar">
                <div class="dropdown-menu-header" v-if="dropdownOpen">
                    <div class="dropdown-item-h">
                        Sair
                    </div>
                </div>
            </div>
        </div>
        <div class="sub">
            <router-link class="link" to="dashboard" :class="{ 'link-selected': currentPage.includes('dashboard') }">
                Dashboard
            </router-link>
            <router-link class="link" to="rotas" :class="{ 'link-selected': currentPage.includes('rotas') }">
                Rotas
            </router-link>
            <router-link class="link" to="historico" :class="{ 'link-selected': currentPage.includes('historico') }">
                Histórico
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
            userName: 'Estevão',
            dropdownOpen: false
        }
    },

    computed: {
        currentPage() {
            return this.$route.name?.toLowerCase() || this.$route.path?.toLowerCase();
        },
    },

    methods: {
        handleClick() {
            if (this.to) {
                this.$router.push(this.to);
            } else {
                this.clickAction();
            }
        },
    },

    components: {
    }
}
</script>