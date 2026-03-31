// src/router.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { PLANET_IDS } from '@/lib/planets'

// Routes are used for URL state only — App.vue watches the route
// and drives the 3D scene accordingly.
const Noop = { render: () => null }

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'overview', component: Noop },
  {
    path: '/:planetId',
    name: 'planet',
    component: Noop,
    beforeEnter(to) {
      if (!PLANET_IDS.includes(to.params.planetId as string)) {
        return { name: 'overview' }
      }
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
