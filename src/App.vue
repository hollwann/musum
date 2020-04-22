<template>
  <v-app>
    <AppBar />
    <v-content class="background">
      <router-view />
    </v-content>
  </v-app>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
export default {
  components: {
    AppBar
  },
  name: 'App'
}
</script>
<style lang="css">
.background {
  background-color: rgb(245, 245, 245);
}
</style>
