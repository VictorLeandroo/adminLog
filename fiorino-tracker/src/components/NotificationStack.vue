<template>
    <div class="notification-stack" aria-live="polite">
        <transition-group name="toast-list">
            <article
                v-for="item in notifications"
                :key="item.id"
                class="toast-card"
                :class="item.type">
                <span class="toast-icon">
                    <i class="fa-solid" :class="iconFor(item.type)"></i>
                </span>
                <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.message }}</p>
                </div>
                <button class="toast-close" @click="dismissNotification(item.id)" aria-label="Fechar notificação">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </article>
        </transition-group>
    </div>
</template>

<script>
import { dismissNotification, notificationState } from '@/services/notificationService'

export default {
    name: 'NotificationStack',

    computed: {
        notifications() {
            return notificationState.items
        }
    },

    methods: {
        dismissNotification,
        iconFor(type) {
            if (type === 'success') return 'fa-circle-check'
            if (type === 'error') return 'fa-triangle-exclamation'
            return 'fa-circle-info'
        }
    }
}
</script>

<style scoped>
.notification-stack {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 3000;
    display: grid;
    gap: 10px;
    width: min(380px, calc(100vw - 32px));
    pointer-events: none;
}

.toast-card {
    pointer-events: auto;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 30px;
    gap: 10px;
    align-items: flex-start;
    border: 1px solid var(--border-soft);
    border-left: 4px solid var(--primary-color);
    border-radius: 16px;
    padding: 12px;
    background: var(--surface-strong);
    color: var(--text-strong);
    box-shadow: var(--shadow-elevated);
    backdrop-filter: blur(16px);
}

.toast-card.success {
    border-left-color: #16a34a;
}

.toast-card.error {
    border-left-color: #ef4444;
}

.toast-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-soft);
    color: var(--primary-color);
}

.toast-card.success .toast-icon {
    background: rgba(22, 163, 74, 0.14);
    color: #16a34a;
}

.toast-card.error .toast-icon {
    background: rgba(239, 68, 68, 0.14);
    color: #ef4444;
}

.toast-card strong {
    display: block;
    line-height: 1.15;
}

.toast-card p {
    margin-top: 3px;
    color: var(--text-muted);
    line-height: 1.35;
}

.toast-close {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 10px;
    background: var(--surface-muted);
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.toast-list-enter-active,
.toast-list-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-list-enter-from,
.toast-list-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

@media (max-width: 520px) {
    .notification-stack {
        top: auto;
        right: 12px;
        bottom: 12px;
        width: calc(100vw - 24px);
    }
}
</style>
