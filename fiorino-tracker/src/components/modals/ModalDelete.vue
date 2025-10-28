<template>
    <div class="modal-overlay" v-show="isVisible" tabindex="-1" role="dialog"
        :aria-hidden="isVisible ? 'false' : 'true'">
        <div class="modal-dialog modal-dialog-centered" :style="{ maxWidth: maxWidth }" role="document">
            <div class="card modal-content" style="border: none">
                <div class="card-body p-2">
                    <div class="row">
                        <div class="col-12 mb-2 d-flex justify-content-center">
                            <div>
                                <i class="icon-modal-delete" :class="icon" v-if="!img"></i>
                                <img class="icon-modal-delete" :src="`/img/coins/${img?.toLowerCase()}.png`" height="35" v-else>
                            </div>
                        </div>

                        <div class="col-12 mb-1">
                            <p class="mb-0 text-center"><strong>{{ title }}</strong></p>
                        </div>

                        <div class="col-12 mb-1">
                            <p class="mb-0 obs-card text-center">{{ obs }} </p>
                        </div>

                        <div class="col-12 mt-3 d-flex">
                            <button class="button-secundary-gray mr-1 w-100" @click="closeModal">
                                Cancelar
                            </button>
                            <button class="button-red w-100" @click="confirmAction" :disabled="isDisabledConfirm">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

export default {
    props: {
        isVisible: {
            type: Boolean,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: false,
            default: 'fa-solid fa-trash'
        },
        img: {
            type: String,
            required: false,
        },
        obs: {
            type: String,
            required: false,
            default: `Você tem certeza que quer continuar? Essa ação não poderá ser revertida.`
        },
        options: {
            type: Array,
        },
        maxWidth: {
            type: String,
            default: '290px'
        },
    },

    data() {
        return {
            reason: ''
        }
    },

    methods: {
        closeModal() {
            document.body.style.overflow = 'auto';
            this.$emit('update:isVisible', false);
        },

        confirmAction() {
            this.$emit('confirm');
            this.closeModal();
        }
    },

    watch: {
        isVisible(newValue) {
            if (newValue) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        }
    }
}
</script>


<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
}

.modal-dialog {
    max-width: 290px;
    margin: 0;
    pointer-events: none;
}

.modal-content {
    pointer-events: auto;
}

.card-body {
    padding: 15px;
}
</style>
