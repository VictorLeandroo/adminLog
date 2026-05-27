<template>
  <button class="button-comp" :class="[btnClass, { 'button-loading': isButtonLoading }]" @click="handleClick"
    :disabled="isButtonLoading || isDisabled || disabled">
    <span class="button-content" :class="{ invisible: isButtonLoading }">
      <slot></slot>
    </span>
    <span class="loader" v-if="isButtonLoading"></span>
  </button>
</template>

<script>
export default {
  name: 'ButtonComp',

  data() {
    return {
      internalLoading: false,
    }
  },

  props: {
    btnClass: {
      type: String,
      default: 'button-primary',
    },

    clickAction: {
      type: Function,
      required: false,
    },

    isLoading: {
      type: Boolean,
      default: false,
    },

    isDisabled: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },

    to: {
      type: String,
      default: null,
    },
  },

  computed: {
    isButtonLoading() {
      return this.isLoading || this.internalLoading
    },
  },

  methods: {
    async handleClick() {
      if (this.isButtonLoading || this.isDisabled || this.disabled) return

      if (this.to) {
        this.$router.push(this.to);
      } else if (this.clickAction) {
        const result = this.clickAction();

        if (result && typeof result.finally === 'function') {
          this.internalLoading = true
          try {
            await result
          } finally {
            this.internalLoading = false
          }
        }
      }
    },
  },
}
</script>

<style scoped>
.button-comp {
  appearance: none;
  position: relative;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  line-height: 1.2 !important;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
}

.button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: inherit;
}

.button-content.invisible {
  visibility: hidden;
}

.button-loading {
  cursor: wait !important;
  pointer-events: auto;
}

.loader {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 15px;
  height: 15px;
  margin-left: -7.5px;
  margin-top: -7.5px;
  border: 2px solid currentColor;
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
</style>
