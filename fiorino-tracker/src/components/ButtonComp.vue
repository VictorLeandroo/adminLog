<template>
  <button class="button-comp" :class="[btnClass]" @click="handleClick" :disabled="isLoading || isDisabled || disabled">
    <slot></slot> <span class="loader" v-if="isLoading"></span>
  </button>
</template>

<script>
export default {
  name: 'ButtonComp',

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
    },

    isDisabled: {
      type: Boolean
    },
    disabled: {
      type: Boolean
    },

    to: {
      type: String,
      default: null,
    },
  },

  methods: {
    handleClick() {
      if (this.to) {
        this.$router.push(this.to);
      } else if (this.clickAction) {
        this.clickAction();
      }
    },
  },
}
</script>

<style scoped>
.button-comp {
  appearance: none;
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

.loader {
  width: 15px;
  height: 15px;
  border: 2px solid #FFF;
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
