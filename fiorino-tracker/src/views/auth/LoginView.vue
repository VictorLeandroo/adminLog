<template>
  <div class="login-page">
    <section class="login-shell">
      <div class="brand-panel">
        <div class="brand-top">
          <img src="@/assets/img/logo.png" alt="Fiorino Tracker" />
          <div>
            <strong>Fiorino Tracker</strong>
            <small>Operacao, frota e financeiro</small>
          </div>
        </div>

        <div class="brand-copy">
          <span class="eyebrow">Controle de campo</span>
          <h1>Entre para acompanhar suas rotas com clareza.</h1>
          <p>Motoristas registram viagens e despesas. Administração revisa rotas, frota e financeiro em um único painel.</p>
        </div>

        <div class="brand-metrics">
          <div>
            <strong>2</strong>
            <small>perfis</small>
          </div>
          <div>
            <strong>24h</strong>
            <small>operacao</small>
          </div>
          <div>
            <strong>100%</strong>
            <small>mobile</small>
          </div>
        </div>
      </div>

      <div class="login-card">
        <div class="login-card-head">
          <span class="login-icon">
            <i class="fa-solid fa-lock"></i>
          </span>
          <div>
            <span class="eyebrow">Acesso seguro</span>
            <h4>Entrar na conta</h4>
          </div>
        </div>

        <form @submit.prevent="handleLogin">
          <label for="email" class="form-label">E-mail</label>
          <div class="input-shell">
            <i class="fa-solid fa-envelope"></i>
            <input
              v-model.trim="form.email"
              type="email"
              id="email"
              placeholder="seuemail@email.com"
              autocomplete="email"
              required
            />
          </div>

          <label for="password" class="form-label mt-2">Senha</label>
          <div class="input-shell">
            <i class="fa-solid fa-key"></i>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              id="password"
              placeholder="Digite sua senha"
              autocomplete="current-password"
              required
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              <i class="fa-solid" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>

          <div v-if="errorMessage" class="login-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <ButtonComp
            btn-class="button-primary button-big w-100"
            :click-action="handleLogin"
            :is-disabled="isLoading || !form.email || !form.password"
            :is-loading="isLoading">
            Entrar
          </ButtonComp>
        </form>

      </div>
    </section>
  </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import { loginUser } from '@/services/authService';

export default {
  name: 'LoginView',

  components: {
    ButtonComp
  },

  data() {
    return {
      form: {
        email: '',
        password: ''
      },
      isLoading: false,
      errorMessage: '',
      showPassword: false
    }
  },

  mounted() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light')
  },

  methods: {
    async handleLogin() {
      if (this.isLoading || !this.form.email || !this.form.password) return

      this.isLoading = true
      this.errorMessage = ''

      try {
        const { token, user } = await loginUser(this.form.email, this.form.password)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('profileType', user.role === 'ADMIN' ? 'admin' : 'driver')
        window.dispatchEvent(new CustomEvent('profile-updated', {
          detail: user.role === 'ADMIN' ? 'admin' : 'driver'
        }))
        this.$router.push('/dashboard')
      } catch (err) {
        console.error(err)
        this.errorMessage = err.response?.data?.message || 'Não foi possível entrar. Confira seus dados.'
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(var(--primary-color-rgb), 0.2), transparent 34rem),
    radial-gradient(circle at bottom right, rgba(22, 163, 74, 0.12), transparent 30rem),
    var(--app-bg);
}

.login-shell {
  width: 100%;
  max-width: 1040px;
  display: grid;
  gap: 14px;
}

.brand-panel,
.login-card {
  border: 1px solid var(--border-soft);
  background: var(--surface-card);
  box-shadow: var(--shadow-soft);
  border-radius: 26px;
  overflow: hidden;
}

.brand-panel {
  padding: 20px;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(145deg, rgba(var(--primary-color-rgb), 0.2), transparent),
    var(--surface-card);
}

.brand-top,
.login-card-head,
.brand-metrics {
  display: flex;
  gap: 12px;
}

.brand-top {
  align-items: center;
}

.brand-top img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--surface-muted);
  padding: 5px;
  object-fit: contain;
}

.brand-top strong,
.login-card h4,
.brand-copy h1 {
  color: var(--text-strong);
}

.brand-top small,
.brand-copy p,
.brand-metrics small {
  color: var(--text-muted);
}

.brand-copy {
  margin: 46px 0;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary-color);
  font-size: 11px;
  font-weight: 900;
}

.brand-copy h1 {
  max-width: 620px;
  font-size: clamp(32px, 8vw, 56px);
  line-height: 0.98;
  margin: 8px 0 12px;
}

.brand-copy p {
  max-width: 540px;
  font-size: 15px;
  line-height: 1.55;
}

.brand-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.brand-metrics div {
  background: var(--surface-muted);
  border-radius: 18px;
  padding: 12px;
}

.brand-metrics strong {
  display: block;
  color: var(--text-strong);
  font-size: 22px;
  line-height: 1;
}

.login-card {
  padding: 18px;
}

.login-card-head {
  align-items: center;
  margin-bottom: 18px;
}

.login-card h4 {
  margin: 2px 0 0;
}

.login-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: var(--primary-soft);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-shell {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-soft);
  background: var(--surface-muted);
  border-radius: 14px;
  padding: 0 12px;
}

.input-shell i {
  color: var(--text-muted);
}

.input-shell input {
  border: 0 !important;
  background: transparent !important;
  min-height: 44px !important;
  width: 100%;
  padding: 0 !important;
}

.password-toggle {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
}

.login-error {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 14px;
  padding: 10px;
  margin: 12px 0;
}

.login-error + .button-comp,
form > .button-comp {
  margin-top: 14px;
}

@media (min-width: 860px) {
  .login-shell {
    grid-template-columns: minmax(0, 1.25fr) 390px;
    align-items: stretch;
  }

  .login-card {
    padding: 24px;
    align-self: center;
  }
}

@media (max-width: 520px) {
  .login-page {
    padding: 10px;
    align-items: flex-start;
  }

  .brand-panel {
    min-height: auto;
  }

  .brand-copy {
    margin: 28px 0;
  }

  .brand-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
