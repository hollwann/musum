<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-header class="title"
              >¿Que es esto?</v-expansion-panel-header
            >
            <v-expansion-panel-content class="subtitle-1 text-justify">
              Cuando tu canción favorita no es lo suficientemente larga. Esta
              aplicación te permite buscar una canción en Spotify y luego genera
              una versión interminable y cambiante de la canción.
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header class="title"
              >¿Como funciona?</v-expansion-panel-header
            >
            <v-expansion-panel-content class="subtitle-1 text-justify">
              Usamos la API de Spotify para dividir la canción en beats. Tocamos
              la canción beat por beat, pero en cada latido existe la
              posibilidad de que saltemos a una parte diferente de la canción
              que suena muy similar al ritmo actual. Hay una visualización
              ingeniosa que muestra todas las transiciones posibles que pueden
              ocurrir en cualquier beat.
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header class="title"
              >¿Quién hizo el logo?</v-expansion-panel-header
            >
            <v-expansion-panel-content class="subtitle-1 text-justify">
              El logo fue aportado por
              <a href="https://www.instagram.com/mendyraquel/" target="_blank"
                >@mendyraquel</a
              >
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header class="title"
              >¿Quien hizo esto?</v-expansion-panel-header
            >
            <v-expansion-panel-content class="subtitle-1 text-justify">
              El sitio original fue creado por
              <a href="https://twitter.com/plamere" target="_blank"
                >Paul Lamere</a
              >
              en el Music Hack Day Boston el 11 de noviembre de 2012 (Más
              información en
              <a
                href="http://musicmachinery.com/2012/11/12/the-infinite-jukebox/"
                target="_blank"
              >
                Music Machinery</a
              >
              ).
              <br /><br />Esta aplicación es una reelaboración del proyecto
              original. El codigo fuente se encuentra en github en
              <a href="https://github.com/hollwann/musum" target="_blank"
                >este repositorio</a
              >
              , y es mantenido por
              <a href="https://hollwann.dev" target="_blank">Hollwann</a> .
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {}
</script>

<style lang="scss" scoped></style>
