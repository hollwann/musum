import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import es from 'vuetify/es5/locale/es'

Vue.use(Vuetify)

export default new Vuetify({
  theme: {
    themes: {
      light: {
        primary: '#b30083',
        secondary: '#2a01b9',
        accent: '#82B1FF',
        error: '#FF5252',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FFC107'
      }
    }
  },
  lang: {
    locales: { es },
    current: 'es'
  },
  icons: {
    iconfont: 'fa'
  }
})
