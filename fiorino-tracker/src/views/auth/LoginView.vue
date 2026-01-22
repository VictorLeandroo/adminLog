<template>
  <div class="login-container d-flex align-items-center justify-content-center vh-100">
    <div class="card shadow p-4">
      <h4 class="text-center mb-2">Sistema de Gestão Fiorino</h4>
      <p class="text-muted text-center mb-2">Acesse sua conta</p>

      <form>
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

        <ButtonComp btn-class="button-primary" class="w-100" :click-action="handleLogin"
          :disabled="isLoading || !form.email || !form.password" :is-loading="isLoading">
          Entrar
        </ButtonComp>
      </form>
    </div>
  </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import { loginUser } from '@/services/authService';

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
      this.errorMessage = ''
      try {
        const { token, user } = await loginUser(this.form.email, this.form.password)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        this.$router.push('/dashboard')
      } catch (err) {
        console.error(err)
        this.errorMessage = err.response?.data?.message || 'Erro ao fazer login'
      } finally {
        this.isLoading = false
      }
    }

  }
}
</script>