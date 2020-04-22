<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="group mt-2">
          <input
            type="text"
            placeholder="Nombre de la canción"
            id="search-text"
            v-model="songName"
            @keydown.enter="searchSongs"
          />
          <span class="highlight"></span>
          <span class="bar"></span>
          <label>Busca tu canción</label>
        </div>
        <v-btn
          color="primary"
          width="100%"
          @click="searchSongs"
          :loading="loading"
          class="mb-5"
          elevation="0"
          >Buscar</v-btn
        >
        <p v-if="!songList.length">Busca una canción para empezar!</p>
        <v-list two-line subheader v-else>
          <v-subheader inset>Canciones</v-subheader>
          <template v-for="song in songList">
            <v-list-item
              :key="song.id"
              @click="$router.push({ name: 'player', params: { song: song } })"
            >
              <v-list-item-content>
                <v-list-item-title v-text="song.title"></v-list-item-title>
                <v-list-item-subtitle
                  v-text="song.artist"
                ></v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-action>
                <v-btn icon>
                  <v-icon color="grey">fa-music</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
            <v-divider inset :key="song.id + 'b'"></v-divider>
          </template>
        </v-list>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import $ from 'jquery'

export default {
  data() {
    return {
      songName: '',
      songList: [
        {
          service: 'SPOTIFY',
          id: '4nK5YrxbMGZstTLbvj6Gxw',
          name: 'Supalonely',
          title: 'Supalonely',
          artist: 'BENEE',
          url: 'https://open.spotify.com/track/4nK5YrxbMGZstTLbvj6Gxw',
          duration: 223480
        },
        {
          service: 'SPOTIFY',
          id: '7eJMfftS33KTjuF7lTsMCx',
          name: 'death bed (feat. beabadoobee)',
          title: 'death bed (feat. beabadoobee)',
          artist: 'Powfu',
          url: 'https://open.spotify.com/track/7eJMfftS33KTjuF7lTsMCx',
          duration: 173333
        },
        {
          service: 'SPOTIFY',
          id: '4rCKRVJZKVysScn2piDuOT',
          name: 'Something For Your M.I.N.D.',
          title: 'Something For Your M.I.N.D.',
          artist: 'Superorganism',
          url: 'https://open.spotify.com/track/4rCKRVJZKVysScn2piDuOT',
          duration: 165391
        }
      ],
      loading: false
    }
  },
  methods: {
    searchSongs() {
      if (!this.songName) return
      $('#search-text').blur()
      this.loading = true
      var url = `https://cors-anywhere.herokuapp.com/https://eternalbox.dev/api/analysis/search?query=${this.songName}&results=30`

      $.ajax({
        url: url,
        dataType: 'json',
        type: 'GET',
        crossDomain: true,
        success: data => {
          this.songList = data
          this.loading = false
          console.log(data)
        },
        error: (xhr, textStatus, error) => {
          console.log(xhr)
          console.log(textStatus)
          console.log(error)
          navigator.notification.alert(
            'Ocurrio un error de conexión, intentalo de nuevo.'
          )
          this.loading = false
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.group {
  position: relative;
  margin-bottom: 45px;
}
input {
  font-size: 18px;
  padding: 10px 10px 10px 5px;
  display: block;
  width: 100%;
  border: none;
  border-bottom: 1px solid #757575;
}
input:focus {
  outline: none;
}

/* LABEL ======================================= */
label {
  color: #999;
  font-size: 18px;
  font-weight: normal;
  position: absolute;
  pointer-events: none;
  left: 5px;
  top: 10px;
  transition: 0.2s ease all;
  -moz-transition: 0.2s ease all;
  -webkit-transition: 0.2s ease all;
}

/* active state */
input:focus ~ label,
input:valid ~ label {
  top: -20px;
  font-size: 14px;
  color: #5264ae;
}

/* BOTTOM BARS ================================= */
.bar {
  position: relative;
  display: block;
  width: 300px;
}
.bar:before,
.bar:after {
  content: '';
  height: 2px;
  width: 0;
  bottom: 1px;
  position: absolute;
  background: #5264ae;
  transition: 0.2s ease all;
  -moz-transition: 0.2s ease all;
  -webkit-transition: 0.2s ease all;
}
.bar:before {
  left: 50%;
}
.bar:after {
  right: 50%;
}

/* active state */
input:focus ~ .bar:before,
input:focus ~ .bar:after {
  width: 50%;
}

/* HIGHLIGHTER ================================== */
.highlight {
  position: absolute;
  height: 60%;
  width: 100px;
  top: 25%;
  left: 0;
  pointer-events: none;
  opacity: 0.5;
}

/* active state */
input:focus ~ .highlight {
  -webkit-animation: inputHighlighter 0.3s ease;
  -moz-animation: inputHighlighter 0.3s ease;
  animation: inputHighlighter 0.3s ease;
}

/* ANIMATIONS ================ */
@-webkit-keyframes inputHighlighter {
  from {
    background: #5264ae;
  }
  to {
    width: 0;
    background: transparent;
  }
}
@-moz-keyframes inputHighlighter {
  from {
    background: #5264ae;
  }
  to {
    width: 0;
    background: transparent;
  }
}
@keyframes inputHighlighter {
  from {
    background: #5264ae;
  }
  to {
    width: 0;
    background: transparent;
  }
}
</style>
