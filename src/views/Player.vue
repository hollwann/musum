<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <p class="display-1">{{ song.title }}</p>
        <p class="subtitle-1">{{ song.artist }}</p>
        <v-btn
          @click="startControl"
          width="100%"
          color="primary"
          :loading="!driver"
          :disabled="!driver"
          elevation="0"
          >{{ !playing ? 'INCIAR' : 'PARAR' }}
          <v-icon color="white" class="ml-3" small>{{
            !playing ? 'fa-play' : 'fa-stop'
          }}</v-icon>
        </v-btn>
        <p class="subtitle-1">
          Beats: <span id="beats">0</span> <br />
          Tiempo: <span id="time">0</span>
        </p>
        <p class="title text-center" id="loader-text" v-if="!driver"></p>
        <div id="tiles"></div>
        <v-btn outlined width="100%" @click="openSong(song.url)"
          >Abrir en Spotify</v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import go from '@/assets/js/go.js'
export default {
  props: {
    song: {
      type: Object,
      required: true
    }
  },
  async mounted() {
    if (!this.song) {
      this.$router.push({ name: 'home' })
      return
    }
    try {
      this.driver = await go(this.song.id)
    } catch (e) {
      console.log(e)
      navigator.notification.alert(
        'Ocurrió un error cargando la canción. Intentalo mas tarde.'
      )
      this.$router.push({ name: 'home' })
    }
  },
  data() {
    return {
      driver: null,
      playing: false,
      loading: true
    }
  },
  methods: {
    startControl() {
      if (!this.driver.isRunning()) {
        this.driver.start()
        this.playing = true
      } else {
        this.driver.stop()
        this.playing = false
      }
    },
    openSong(url) {
      window.open(url, '_blank')
    }
  },
  beforeDestroy() {
    this.driver && this.driver.stop()
  }
}
</script>

<style lang="scss" scoped></style>
