<template>
  <HeaderComp v-if="isHeaderShow" />
  <router-view />
</template>

<script>
import HeaderComp from './components/HeaderComp.vue';

export default {
  name: 'App',
  components: {
    HeaderComp
  },

  computed: {
    isHeaderShow() {
      const invalidPaths = ['/login'];
      return !invalidPaths.some(path => this.$route.path.startsWith(path));
    }
  }
}
</script>
