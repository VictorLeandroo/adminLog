<template>
  <div class="login-container d-flex align-items-center justify-content-center vh-100">
    <div class="card shadow p-4">
      <h4 class="text-center mb-2">Sistema de Gestão Fiorino</h4>
      <p class="text-muted text-center mb-2">Acesse sua conta</p>

      <form @submit.prevent="handleLogin">
        <div class="mb-2">
          <label for="email" class="form-label">E-mail</label>
          <input v-model="form.email" type="email" class="form-control" id="email" placeholder="seuemail@email.com"
            required />
        </div>

        <div class="mb-3">
          <label for="password" class="form-label">Senha</label>
          <input v-model="form.password" type="password" class="form-control" id="password" placeholder="••••••••"
            required />
        </div>

        <ButtonComp type="submit" btn-class="button-primary" class="w-100"
          :disabled="isLoading || !form.email || !form.password" :is-loading="isLoading">
          Entrar
        </ButtonComp>
      </form>
    </div>
  </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';

export default {
  name: 'LoginView',
  data() {
    return {
      form: {
        email: '',
        password: ''
      },
      isLoading: false
    }
  },

  components: {
    ButtonComp
  },

  methods: {
    async handleLogin() {
      this.isLoading = true
      try {
        console.log('Login com', this.form)
        this.$router.push('/dashboard')
      } catch (error) {
        console.error('Erro no login:', error)
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>