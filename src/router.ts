// src/router.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Routes are used for URL state only — App.vue watches the route
// and drives the 3D scene accordingly.
// Planet ID validation happens in App.vue after data is loaded.
const Noop = { render: () => null }

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'overview', component: Noop },
  {
    path: '/:planetId',
    name: 'planet',
    component: Noop,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
