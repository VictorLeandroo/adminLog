<template>
    <div class="modal-overlay" v-if="isVisible" tabindex="-1" role="dialog" :aria-hidden="isVisible ? 'false' : 'true'">
        <div class="modal-dialog modal-dialog-centered" :style="[{ maxWidth: maxWidth }, { minWidth: adjustedMinWidth }]"
            role="document">
            <div class="card modal-content" style="border: none;">
                <i class="fa-solid fa-circle-xmark i-pointer button-close" @click="closeModal" v-if="!isLoading"></i>
                <div class="card-body p-2">
                    <slot></slot>
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
        maxWidth: {
            type: String,
            default: '450px'
        },
        minWidth: {
            type: String,
            default: '450px'
        },
        isLoading: {
            type: Boolean,
            required: true
        },
    },
    data() {
        return {
            adjustedMinWidth: this.minWidth
        }
    },
    mounted() {
        this.setResponsiveMinWidth();
        window.addEventListener('resize', this.setResponsiveMinWidth);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.setResponsiveMinWidth);
    },
    methods: {
        closeModal() {
            this.$emit('update:isVisible', false);
        },
        setResponsiveMinWidth() {
            const minWidthPx = parseInt(this.minWidth);
            const windowWidth = window.innerWidth;

            if (windowWidth < minWidthPx) {
                this.adjustedMinWidth = `${windowWidth}px`;
            } else {
                this.adjustedMinWidth = this.minWidth;
            }
        }
    },
    watch: {
        isVisible(newValue) {
            if (newValue) {
                setTimeout(()=>{
                    document.body.style.overflow = 'hidden';
                    this.setResponsiveMinWidth(); 
                },20)
            } else {
                setTimeout(()=>{
                    document.body.style.overflow = 'auto';
                },20)
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
}

.modal-dialog {
    margin: 0;
}
</style>
