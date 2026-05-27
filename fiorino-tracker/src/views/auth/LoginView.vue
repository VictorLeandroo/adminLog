<template>
  <div class="login-page">
    <section class="login-shell">
      <div class="login-main">
        <div class="brand-panel">
          <div class="brand-content">
            <div class="brand-top">
              <img src="@/assets/img/logo.png" alt="Fiorino Tracker" />
              <div>
                <strong>Fiorino Tracker</strong>
                <small>Operação, frota e financeiro</small>
              </div>
            </div>

            <div class="brand-copy">
              <span class="eyebrow">Controle de frota inteligente</span>
              <h1>Entre para acompanhar suas rotas com <span>clareza.</span></h1>
              <p>Motoristas registram viagens e despesas. Administração revisa rotas, frota e financeiro em um único painel.</p>
            </div>

            <div class="brand-metrics">
              <div>
                <span class="metric-icon"><i class="fa-solid fa-users"></i></span>
                <strong>2</strong>
                <small>perfis</small>
              </div>
              <div>
                <span class="metric-icon"><i class="fa-regular fa-clock"></i></span>
                <strong>24h</strong>
                <small>operação</small>
              </div>
              <div>
                <span class="metric-icon"><i class="fa-solid fa-mobile-screen"></i></span>
                <strong>100%</strong>
                <small>mobile</small>
              </div>
            </div>
          </div>
        </div>

        <div class="login-side">
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
                <i class="fa-solid fa-lock"></i>
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

              <div class="form-options">
                <label class="remember-check">
                  <input v-model="rememberMe" type="checkbox" />
                  <span>Lembrar de mim</span>
                </label>
                <button type="button" class="forgot-link">Esqueceu sua senha?</button>
              </div>

              <div v-if="errorMessage" class="login-error">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>{{ errorMessage }}</span>
              </div>

              <button class="login-submit" type="submit" :disabled="isLoading || !form.email || !form.password">
                <span>Entrar</span>
                <span class="loader" v-if="isLoading"></span>
              </button>
            </form>

            <div class="login-divider">
              <span></span>
              <small>ou</small>
              <span></span>
            </div>

            <button class="verification-button" type="button">
              <i class="fa-solid fa-shield-halved"></i>
              Acessar com código de verificação
            </button>
          </div>
        </div>
      </div>

      <div class="benefit-bar">
        <article>
          <span><i class="fa-solid fa-shield-halved"></i></span>
          <div>
            <strong>Segurança de ponta</strong>
            <small>Seus dados protegidos com criptografia.</small>
          </div>
        </article>
        <article>
          <span><i class="fa-solid fa-cloud"></i></span>
          <div>
            <strong>Acesso em qualquer lugar</strong>
            <small>Painel 100% responsivo para mobile, tablet e desktop.</small>
          </div>
        </article>
        <article>
          <span><i class="fa-solid fa-rocket"></i></span>
          <div>
            <strong>Performance que acompanha</strong>
            <small>Sistema rápido, estável e feito para o dia a dia.</small>
          </div>
        </article>
      </div>
    </section>

    <footer class="login-footer">
      <i class="fa-solid fa-shield-halved"></i>
      <span>© 2024 Fiorino Tracker. Todos os direitos reservados.</span>
    </footer>
  </div>
</template>

<script>
import { loginUser } from '@/services/authService';

export default {
  name: 'LoginView',

  data() {
    return {
      form: {
        email: '',
        password: ''
      },
      isLoading: false,
      errorMessage: '',
      showPassword: false,
      rememberMe: true
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
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 28px 20px 20px;
  background:
    linear-gradient(135deg, rgba(225, 236, 252, 0.96) 0%, rgba(248, 251, 255, 0.86) 46%, rgba(215, 228, 249, 0.9) 100%),
    #eef5ff;
  color: #061531;
  overflow-x: hidden;
}

.login-shell {
  width: 100%;
  max-width: 1180px;
  min-height: 700px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.54);
  box-shadow: 0 28px 90px rgba(41, 68, 111, 0.22);
  backdrop-filter: blur(18px);
}

.login-main {
  flex: 1;
  min-height: 600px;
  display: grid;
  grid-template-columns: 55% 45%;
}

.brand-panel {
  position: relative;
  min-height: 600px;
  display: flex;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(233, 242, 255, 0.92) 0%, rgba(233, 242, 255, 0.18) 42%, rgba(226, 238, 251, 0.28) 100%),
    url('@/assets/img/background-log.png') center bottom / cover no-repeat;
}

.brand-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(232, 242, 255, 0.55), rgba(232, 242, 255, 0.05));
  pointer-events: none;
}

.brand-content {
  position: relative;
  z-index: 1;
  width: min(530px, 82%);
  margin: 44px 0 0 58px;
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
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  padding: 8px;
  object-fit: contain;
  box-shadow: 0 10px 26px rgba(36, 68, 112, 0.12);
}

.brand-top strong,
.login-card h4,
.brand-copy h1 {
  color: #071633;
}

.brand-top small,
.brand-copy p,
.brand-metrics small {
  color: #52627a;
}

.brand-top strong {
  display: block;
  font-size: 19px;
  line-height: 1.05;
}

.brand-top small {
  display: block;
  font-size: 14px;
  margin-top: 4px;
}

.brand-copy {
  margin: 40px 0 28px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0;
  color: #1d58e8;
  font-size: 12px;
  font-weight: 900;
}

.brand-copy h1 {
  max-width: 510px;
  font-size: 42px;
  line-height: 1.04;
  margin: 14px 0 20px;
  font-weight: 900;
}

.brand-copy h1 span {
  color: #2f6df3;
}

.brand-copy p {
  max-width: 450px;
  font-size: 16px;
  line-height: 1.45;
  margin: 0;
}

.brand-metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 448px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 40px rgba(61, 88, 132, 0.12);
  backdrop-filter: blur(14px);
}

.brand-metrics div {
  min-width: 0;
  display: grid;
  grid-template-columns: 40px auto;
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
}

.metric-icon {
  grid-row: 1 / 3;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1556d8;
  background: linear-gradient(135deg, #dce7ff, #f2f7ff);
  font-size: 18px;
}

.brand-metrics strong {
  color: #071633;
  font-size: 20px;
  line-height: 1;
  font-weight: 900;
}

.brand-metrics small {
  font-size: 12px;
  line-height: 1.2;
}

.login-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 44px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(246, 250, 255, 0.74));
}

.login-card {
  width: min(100%, 440px);
  min-height: 520px;
  padding: 38px 32px 32px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 26px 70px rgba(44, 69, 109, 0.13);
}

.login-card-head {
  align-items: center;
  margin-bottom: 22px;
}

.login-card h4 {
  margin: 5px 0 0;
  font-size: 21px;
  line-height: 1.1;
  font-weight: 900;
}

.login-icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: linear-gradient(135deg, #dce7ff, #eef4ff);
  color: #1556d8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}

.form-label {
  color: #172142;
  font-weight: 600;
  margin-bottom: 10px;
}

.input-shell {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #cfdbec;
  background: #fff;
  border-radius: 14px;
  padding: 0 15px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.input-shell i {
  color: #6f7f9d;
  font-size: 18px;
}

.input-shell input {
  border: 0 !important;
  background: transparent !important;
  min-height: 48px !important;
  width: 100%;
  padding: 0 !important;
  color: #111d3c;
  font-size: 16px;
  font-weight: 600;
}

.input-shell input::placeholder {
  color: #6c7890;
  font-weight: 500;
}

.password-toggle {
  border: 0;
  background: transparent;
  color: #697892;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin: 16px 0;
}

.remember-check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #172142;
  font-weight: 600;
  font-size: 14px;
}

.remember-check input {
  width: 20px;
  height: 20px;
  accent-color: #2e69ec;
}

.forgot-link {
  border: 0;
  background: transparent;
  color: #1556f0;
  font-weight: 700;
  font-size: 14px;
  padding: 0;
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

.login-submit {
  width: 100%;
  min-height: 50px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, #174ed7, #3b73f7);
  box-shadow: 0 12px 24px rgba(35, 93, 228, 0.28);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.login-divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  margin: 22px 0 20px;
  color: #52627a;
  font-weight: 800;
}

.login-divider span {
  height: 1px;
  background: #d5dfed;
}

.verification-button {
  width: 100%;
  min-height: 50px;
  border: 1px solid #b9cff8;
  border-radius: 10px;
  color: #164fcb;
  background: #fff;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.benefit-bar {
  min-height: 96px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgba(196, 211, 229, 0.9);
  background: rgba(255, 255, 255, 0.72);
}

.benefit-bar article {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 34px;
}

.benefit-bar article + article {
  border-left: 1px solid #d7e1ef;
}

.benefit-bar span {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #164fcb;
  background: #f1f6ff;
  font-size: 20px;
  flex: 0 0 auto;
}

.benefit-bar strong {
  display: block;
  color: #172142;
  font-size: 14px;
  line-height: 1.25;
}

.benefit-bar small {
  display: block;
  color: #52627a;
  font-size: 13px;
  line-height: 1.4;
  margin-top: 3px;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #66758d;
  font-weight: 600;
  font-size: 14px;
}

.loader {
  width: 15px;
  height: 15px;
  border: 2px solid #fff;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .login-main {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 500px;
  }

  .login-side {
    padding: 36px 22px;
  }

  .benefit-bar {
    grid-template-columns: 1fr;
  }

  .benefit-bar article + article {
    border-left: 0;
    border-top: 1px solid #d7e1ef;
  }
}

@media (max-width: 620px) {
  .login-page {
    padding: 14px;
    gap: 18px;
  }

  .login-shell {
    border-radius: 20px;
    min-height: auto;
  }

  .brand-panel {
    min-height: 520px;
  }

  .brand-content {
    width: auto;
    margin: 28px 18px 0;
  }

  .brand-top img {
    width: 58px;
    height: 58px;
  }

  .brand-copy h1 {
    font-size: 34px;
  }

  .brand-copy p {
    font-size: 16px;
  }

  .brand-metrics {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .login-card {
    min-height: auto;
    padding: 30px 18px;
  }

  .form-options {
    align-items: flex-start;
    flex-direction: column;
  }

  .benefit-bar article {
    padding: 22px 18px;
  }
}
</style>
