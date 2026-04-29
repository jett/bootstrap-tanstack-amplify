import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'

import '@mantine/core/styles.layer.css'
import '@mantine/notifications/styles.layer.css'
import 'mantine-datatable/styles.layer.css'

import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'App' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <HeadContent />
      </head>
      <body>
        <MantineProvider>
          <Outlet />
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
