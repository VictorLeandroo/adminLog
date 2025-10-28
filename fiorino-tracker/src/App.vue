<template>
  <HeaderComp />
  <router-view />
</template>

<script>
import HeaderComp from './components/HeaderComp.vue';

export default {
  name: 'App',
  components: {
    HeaderComp
  }
}
</script>
