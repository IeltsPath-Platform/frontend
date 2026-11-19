import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import '@/styles/globals.css'
import { installVietnameseZodMessages } from '@/lib/validation/vietnameseZodMessages'

installVietnameseZodMessages()

createRoot(document.getElementById('root')!).render(
    <App />
)
