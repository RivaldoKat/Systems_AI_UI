const routes = [
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/app/overview' },
      { path: 'app/:section', component: () => import('@/pages/ManagementPage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/app/overview',
  },
]

export default routes
