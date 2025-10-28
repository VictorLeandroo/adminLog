<template>
    <div class="dashboard-container min-vh-100">
        <div class="container py-2">
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="card shadow-sm border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title mb-2">Motorista</h5>
                            <p class="text-muted mb-3">Gerencie suas rotas e entregas.</p>
                            <button class="btn btn-outline-primary w-100" @click="goTo('motorista')">Acessar</button>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card shadow-sm border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title mb-2">Gestora</h5>
                            <p class="text-muted mb-3">Visualize e edite as entregas.</p>
                            <button class="btn btn-outline-primary w-100" @click="goTo('gestora')">Acessar</button>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card shadow-sm border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title mb-2">Financeiro</h5>
                            <p class="text-muted mb-3">Acompanhe ganhos e relatórios.</p>
                            <button class="btn btn-outline-primary w-100" @click="goTo('financeiro')">Acessar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'DashboardView',
    data() {
        return {
            userName: 'Usuário'
        }
    },
    methods: {
        goTo(role) {
            this.$router.push(`/${role}`)
        },
        handleLogout() {
            console.log('Logout realizado')
            this.$router.push('/')
        }
    }
}
</script>