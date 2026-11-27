import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{ token: {
      colorPrimary: '#4F46E5',
      colorPrimaryHover: '#4338CA',
      colorPrimaryActive: '#3730A3',
      colorLink: '#4F46E5',
      colorError: '#B42318',
      colorErrorHover: '#9C2119',
      colorErrorActive: '#7A1A12',
      colorTextPlaceholder: '#475569',
      colorTextDescription: '#475569',
      colorText: '#16233D',
      colorTextSecondary: '#475569',
      borderRadius: 8,
      controlHeight: 40,
      fontFamily: 'system-ui, sans-serif',
    } }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
)
