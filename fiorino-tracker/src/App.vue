<template>
  <HeaderComp v-if="isHeaderShow" />
  <router-view />
  <NotificationStack />
</template>

<script>
import HeaderComp from './components/HeaderComp.vue';
import NotificationStack from './components/NotificationStack.vue';

export default {
  name: 'App',
  components: {
    HeaderComp,
    NotificationStack
  },

  computed: {
    isHeaderShow() {
      const invalidPaths = ['/login'];
      return !invalidPaths.some(path => this.$route.path.startsWith(path));
    }
  },

  mounted() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light')
  }
}
</script>
