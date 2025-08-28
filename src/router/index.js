import { createRouter, createWebHistory } from 'vue-router'
import ChartView from '../views/ChartView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chart',
      component: ChartView,
    },
    {
      path: '/data',
      name: 'data',
      // route level code-splitting
      // this generates a separate chunk (Data.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/DataView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileDashboardView.vue'),
    },
    {
      path: '/profile/by-method', 
      name: 'profile-by-method',
      component: () => import('../views/ProfileByMethodView.vue'),
    },
    {
      path: '/profile/ranking',
      name: 'profile-ranking',
      component: () => import('../views/ProfileRanking.vue'),
    }
  ],
})

export default router
