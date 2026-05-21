<template>
    <div class="profile-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="profile-hero">
                <div class="profile-identity">
                    <label class="avatar-picker">
                        <img :src="photoPreview" alt="Foto do perfil" />
                        <input type="file" accept="image/*" @change="handlePhoto" />
                        <span><i class="fa-solid fa-camera"></i></span>
                    </label>

                    <div>
                        <span class="eyebrow">Perfil</span>
                        <h4>{{ profileForm.name || 'Usuario' }}</h4>
                        <p>{{ roleLabel }} • {{ profileForm.email }}</p>
                    </div>
                </div>

                <ButtonComp btn-class="button-primary button-big" :click-action="saveProfile">
                    <i class="fa-solid fa-floppy-disk"></i>
                    Salvar perfil
                </ButtonComp>
            </section>

            <section class="profile-layout">
                <article class="profile-card">
                    <div class="section-title">
                        <span class="eyebrow">Dados pessoais</span>
                        <h5>Informações da conta</h5>
                    </div>

                    <label class="form-label">Nome</label>
                    <input v-model="profileForm.name" type="text" class="w-100 mb-2" />

                    <label class="form-label">E-mail</label>
                    <input v-model="profileForm.email" type="email" class="w-100 mb-2" disabled />

                    <div class="profile-grid">
                        <div>
                            <small>Perfil de acesso</small>
                            <strong>{{ roleLabel }}</strong>
                        </div>
                        <div>
                            <small>Modo atual</small>
                            <strong>{{ modeLabel }}</strong>
                        </div>
                    </div>
                </article>

                <aside class="profile-card">
                    <div class="section-title">
                        <span class="eyebrow">Preferências</span>
                        <h5>Aparência</h5>
                    </div>

                    <button class="theme-row" @click="toggleTheme">
                        <span>
                            <i class="fa-solid" :class="isDark ? 'fa-moon' : 'fa-sun'"></i>
                        </span>
                        <div>
                            <strong>{{ isDark ? 'Modo escuro' : 'Modo claro' }}</strong>
                            <small>Toque para alternar o tema do painel.</small>
                        </div>
                    </button>

                    <div class="profile-note">
                        <i class="fa-solid fa-circle-info"></i>
                        <p>A foto e o nome ficam salvos neste navegador. Dados sensíveis continuam vindo do login.</p>
                    </div>
                </aside>
            </section>
        </div>
    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue'
import defaultAvatar from '@/assets/img/avatar.jpg'

export default {
    name: 'ProfileView',

    components: { ButtonComp },

    data() {
        const user = JSON.parse(localStorage.getItem('user') || 'null') || {}

        return {
            profileForm: {
                name: localStorage.getItem('profileName') || user.name || '',
                email: user.email || '',
                role: user.role || 'DRIVER'
            },
            photoPreview: localStorage.getItem('profilePhoto') || defaultAvatar,
            isDark: localStorage.getItem('theme') === 'dark',
            profileType: localStorage.getItem('profileType') || 'driver'
        }
    },

    computed: {
        roleLabel() {
            return this.profileForm.role === 'ADMIN' ? 'Administrador' : 'Motorista'
        },

        modeLabel() {
            return this.profileType === 'admin' ? 'Painel administrativo' : 'Operação em campo'
        }
    },

    methods: {
        handlePhoto(event) {
            const file = event.target.files?.[0]
            if (!file) return

            const reader = new FileReader()
            reader.onload = () => {
                this.photoPreview = reader.result
                localStorage.setItem('profilePhoto', reader.result)
                window.dispatchEvent(new CustomEvent('profile-saved'))
            }
            reader.readAsDataURL(file)
            event.target.value = ''
        },

        saveProfile() {
            const user = JSON.parse(localStorage.getItem('user') || 'null') || {}
            const nextUser = { ...user, name: this.profileForm.name }

            localStorage.setItem('user', JSON.stringify(nextUser))
            localStorage.setItem('profileName', this.profileForm.name)
            window.dispatchEvent(new CustomEvent('profile-saved'))
        },

        toggleTheme() {
            this.isDark = !this.isDark
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
            document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light')
            window.dispatchEvent(new CustomEvent('profile-saved'))
        }
    }
}
</script>

<style scoped>
.profile-hero,
.profile-card {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.profile-hero {
    border-radius: 22px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}

.profile-identity {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.avatar-picker {
    position: relative;
    width: 76px;
    height: 76px;
    border-radius: 22px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-soft);
    flex: 0 0 auto;
}

.avatar-picker img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-picker input {
    display: none;
}

.avatar-picker span {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: var(--primary-color);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.profile-hero h4,
.profile-hero p,
.section-title h5 {
    margin: 0;
}

.profile-hero p,
.profile-grid small,
.theme-row small,
.profile-note p {
    color: var(--text-muted);
}

.profile-layout {
    display: grid;
    gap: 12px;
    margin-top: 12px;
}

.profile-card {
    border-radius: 20px;
    padding: 16px;
}

.section-title {
    margin-bottom: 14px;
}

.profile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 8px;
}

.profile-grid div {
    background: var(--surface-muted);
    border-radius: 14px;
    padding: 12px;
}

.profile-grid strong {
    color: var(--text-strong);
    display: block;
    margin-top: 3px;
}

.theme-row {
    width: 100%;
    border: 1px solid var(--border-soft);
    background: var(--surface-muted);
    border-radius: 16px;
    padding: 12px;
    display: flex;
    gap: 10px;
    text-align: left;
    color: var(--text-strong);
}

.theme-row span {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.theme-row strong {
    display: block;
}

.profile-note {
    margin-top: 12px;
    border: 1px dashed var(--border-soft);
    border-radius: 16px;
    padding: 12px;
    display: flex;
    gap: 10px;
    color: var(--primary-color);
    background: var(--surface-muted);
}

.profile-note p {
    line-height: 1.35;
}

@media (min-width: 900px) {
    .profile-layout {
        grid-template-columns: minmax(0, 1fr) 360px;
    }
}

@media (max-width: 620px) {
    .profile-hero,
    .profile-identity {
        flex-direction: column;
        align-items: stretch;
    }

    .profile-grid {
        grid-template-columns: 1fr;
    }
}
</style>
