<template>
  <v-app-bar app color="primary" dark>
    <v-img
      alt="Musum Logo"
      class="shrink mr-2"
      contain
      @click="$router.push({ name: 'home' })"
      :src="require('@/assets/logo.png')"
      width="60"
    />

    <v-spacer></v-spacer>

    <v-btn :to="{ name: 'about' }" text color="primary">
      <v-icon color="white">fa-question-circle</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
export default {}
</script>

<style lang="scss" scoped></style>
