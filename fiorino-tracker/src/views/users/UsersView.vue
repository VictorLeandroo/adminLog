<template>
    <div class="users-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="users-hero">
                <div>
                    <span class="eyebrow">Administração</span>
                    <h4>Motoristas e usuários</h4>
                    <p>Cadastre motoristas, ajuste acessos e resete senhas quando necessário.</p>
                </div>

                <ButtonComp btn-class="button-primary button-big" :click-action="() => openUserModal()">
                    <i class="fa-solid fa-user-plus"></i>
                    Novo usuário
                </ButtonComp>
            </section>

            <div v-if="isLoading && !showUserModal && !showPasswordModal" class="page-loading-state">
                <span class="loader"></span>
                <strong>Carregando usuarios</strong>
                <p>Buscando motoristas, administradores e status de acesso.</p>
            </div>

            <section v-else class="users-grid">
                <article v-for="user in users" :key="user.id" class="user-card" :class="{ inactive: !user.active }">
                    <div class="user-head">
                        <img :src="userPhotoSrc(user)" :alt="`Foto de ${user.name}`" class="user-avatar" />
                        <div class="user-copy">
                            <strong>{{ user.name }}</strong>
                            <small>{{ user.email }}</small>
                        </div>
                        <span class="role-pill" :class="user.role.toLowerCase()">
                            {{ user.role === 'ADMIN' ? 'Admin' : 'Motorista' }}
                        </span>
                    </div>

                    <div class="user-meta">
                        <span :class="user.active ? 'active' : 'inactive'">
                            {{ user.active ? 'Ativo' : 'Inativo' }}
                        </span>
                        <small>Atualizado em {{ formatDate(user.updatedAt) }}</small>
                    </div>

                    <div class="user-actions">
                        <ButtonComp btn-class="button-secundary w-100" :click-action="() => openUserModal(user)">
                            Editar
                        </ButtonComp>
                        <ButtonComp btn-class="button-secundary w-100" :click-action="() => openPasswordModal(user)">
                            Senha
                        </ButtonComp>
                        <ButtonComp
                            :btn-class="user.active ? 'button-secundary-red w-100' : 'button-primary w-100'"
                            :click-action="() => toggleActive(user)">
                            {{ user.active ? 'Desativar' : 'Ativar' }}
                        </ButtonComp>
                    </div>
                </article>

                <div v-if="!users.length" class="empty-state">
                    <i class="fa-solid fa-users"></i>
                    <strong>Nenhum usuário encontrado</strong>
                    <p>Cadastre o primeiro motorista para vincular aos veículos.</p>
                </div>
            </section>
        </div>

        <ModalDefault :is-visible="showUserModal" :isLoading="isLoading" max-width="460px" min-width="320px"
            @update:isVisible="cancelUserModal">
            <div class="modal-head">
                <label class="modal-avatar-picker">
                    <img :src="userFormPhotoPreview" alt="Foto do usuário" />
                    <input type="file" accept="image/*" @change="handleUserPhoto" />
                    <span><i class="fa-solid fa-camera"></i></span>
                </label>
                <div>
                    <h6>{{ userForm.id ? 'Editar usuário' : 'Novo usuário' }}</h6>
                    <p>Motoristas aparecem no select de veículos.</p>
                </div>
            </div>

            <label class="form-label">Nome</label>
            <input v-model="userForm.name" type="text" class="w-100 mb-2" />

            <label class="form-label">E-mail</label>
            <input v-model.trim="userForm.email" type="email" class="w-100 mb-2" />

            <label class="form-label">Perfil</label>
            <select v-model="userForm.role" class="form-select w-100 mb-2">
                <option value="DRIVER">Motorista</option>
                <option value="ADMIN">Admin</option>
            </select>

            <label v-if="!userForm.id" class="form-label">Senha inicial</label>
            <input v-if="!userForm.id" v-model="userForm.password" type="password" class="w-100 mb-2" />

            <label class="check-row">
                <input v-model="userForm.active" type="checkbox" />
                Usuário ativo
            </label>

            <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveUser" :click-action="saveUser">
                Salvar usuário
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :is-visible="showPasswordModal" :isLoading="isLoading" max-width="420px" min-width="320px"
            @update:isVisible="cancelPasswordModal">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-key"></i></span>
                <div>
                    <h6>Resetar senha</h6>
                    <p>{{ selectedUser?.name }}</p>
                </div>
            </div>

            <label class="form-label">Nova senha</label>
            <input v-model="passwordForm.password" type="password" class="w-100 mb-2" />

            <ButtonComp btn-class="button-primary button-big w-100" :is-disabled="passwordForm.password.length < 6" :click-action="resetPassword">
                Atualizar senha
            </ButtonComp>
        </ModalDefault>
    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue'
import ModalDefault from '@/components/modals/ModalDefault.vue'
import defaultAvatar from '@/assets/img/avatar.jpg'
import { formatLocalDate, listUsers, resetUserPasswordApi, saveUserApi, setUserActiveApi } from '@/services/backendService'

export default {
    name: 'UsersView',

    components: {
        ButtonComp,
        ModalDefault
    },

    data() {
        return {
            users: [],
            isLoading: false,
            errorMessage: '',
            showUserModal: false,
            showPasswordModal: false,
            selectedUser: null,
            userForm: this.emptyUserForm(),
            passwordForm: { password: '' }
        }
    },

    computed: {
        canSaveUser() {
            return Boolean(this.userForm.name && this.userForm.email && (this.userForm.id || this.userForm.password?.length >= 6))
        },

        userFormPhotoPreview() {
            return this.userForm.photo?.preview || this.userForm.photoUrl || defaultAvatar
        }
    },

    mounted() {
        this.fetchUsers()
    },

    methods: {
        emptyUserForm() {
            return {
                id: null,
                name: '',
                email: '',
                password: '',
                role: 'DRIVER',
                active: true,
                photo: null,
                photoUrl: '',
                photoName: ''
            }
        },

        async fetchUsers() {
            this.isLoading = true
            try {
                this.users = await listUsers()
            } catch (error) {
                console.error(error)
                this.errorMessage = error.response?.data?.message || 'Não foi possível carregar usuários.'
            } finally {
                this.isLoading = false
            }
        },

        openUserModal(user = null) {
            this.errorMessage = ''
            this.userForm = user ? { ...user, password: '', photo: null } : this.emptyUserForm()
            this.showUserModal = true
        },

        cancelUserModal() {
            this.showUserModal = false
            this.userForm = this.emptyUserForm()
        },

        async saveUser() {
            if (!this.canSaveUser) return
            this.isLoading = true
            this.errorMessage = ''

            try {
                await saveUserApi(this.userForm)
                await this.fetchUsers()
                this.cancelUserModal()
            } catch (error) {
                console.error(error)
                this.errorMessage = error.response?.data?.message || 'Não foi possível salvar usuário.'
            } finally {
                this.isLoading = false
            }
        },

        handleUserPhoto(event) {
            const file = event.target.files?.[0]
            if (!file) return

            this.userForm.photo = {
                file,
                preview: URL.createObjectURL(file),
                name: file.name
            }
            event.target.value = ''
        },

        userPhotoSrc(user) {
            return user.photoUrl || defaultAvatar
        },

        openPasswordModal(user) {
            this.selectedUser = user
            this.passwordForm = { password: '' }
            this.showPasswordModal = true
        },

        cancelPasswordModal() {
            this.showPasswordModal = false
            this.selectedUser = null
            this.passwordForm = { password: '' }
        },

        async resetPassword() {
            if (!this.selectedUser || this.passwordForm.password.length < 6) return

            this.isLoading = true
            try {
                await resetUserPasswordApi(this.selectedUser.id, this.passwordForm.password)
                this.cancelPasswordModal()
            } catch (error) {
                console.error(error)
            } finally {
                this.isLoading = false
            }
        },

        async toggleActive(user) {
            this.isLoading = true
            try {
                await setUserActiveApi(user, !user.active)
                await this.fetchUsers()
            } catch (error) {
                console.error(error)
            } finally {
                this.isLoading = false
            }
        },

        formatDate(date) {
            return formatLocalDate(date)
        }
    }
}
</script>

<style scoped>
.users-hero,
.user-card,
.empty-state {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.users-hero {
    border-radius: 22px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.users-hero h4,
.users-hero p,
.modal-head h6 {
    margin: 0;
}

.users-hero p,
.user-card small,
.modal-head p {
    color: var(--text-muted);
}

.users-grid {
    display: grid;
    gap: 12px;
    margin-top: 12px;
}

.user-card {
    border-radius: 20px;
    padding: 14px;
}

.user-card.inactive {
    opacity: 0.72;
}

.user-head,
.user-meta,
.user-actions,
.modal-head {
    display: flex;
    gap: 10px;
}

.user-head,
.user-meta {
    justify-content: space-between;
    align-items: flex-start;
}

.user-head {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    align-items: center;
}

.user-avatar,
.modal-avatar-picker {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    border: 1px solid var(--border-soft);
    object-fit: cover;
    background: var(--surface-muted);
    flex: 0 0 auto;
}

.user-copy {
    min-width: 0;
}

.user-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-head strong {
    display: block;
    color: var(--text-strong);
}

.role-pill {
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 11px;
    font-weight: 900;
    background: var(--primary-soft);
    color: var(--primary-color);
}

.role-pill.admin {
    background: rgba(22, 163, 74, 0.14);
    color: #16a34a;
}

.user-meta {
    margin: 12px 0;
}

.user-meta .active {
    color: #16a34a;
    font-weight: 900;
}

.user-meta .inactive {
    color: #ef4444;
    font-weight: 900;
}

.user-actions {
    margin-top: 10px;
}

.modal-head {
    align-items: center;
    margin-bottom: 14px;
}

.modal-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.modal-avatar-picker {
    position: relative;
    cursor: pointer;
    overflow: hidden;
}

.modal-avatar-picker img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.modal-avatar-picker input {
    display: none;
}

.modal-avatar-picker span {
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 20px;
    height: 20px;
    border-radius: 8px;
    background: var(--primary-color);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
}

.check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-strong);
    font-weight: 800;
}

.form-error {
    margin: 10px 0 0;
    color: #ef4444;
}

.empty-state {
    border-radius: 20px;
    padding: 28px 18px;
    text-align: center;
}

.empty-state i {
    color: var(--primary-color);
    font-size: 28px;
    margin-bottom: 8px;
}

@media (min-width: 820px) {
    .users-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 620px) {
    .users-hero,
    .user-actions {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
