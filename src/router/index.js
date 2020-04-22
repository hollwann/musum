import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Player from '../views/Player.vue'
import About from '../views/About.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/player',
    name: 'player',
    component: Player,
    props: true
  },
  {
    path: '/about',
    name: 'about',
    component: About
  }
]

const router = new VueRouter({
  scrollBehavior() {
    return { x: 0, y: 0 }
  },
  routes
})

export default router
