import { reactive } from 'vue'

let nextId = 1

export const notificationState = reactive({
  items: []
})

export function notify({ type = 'info', title = '', message = '', timeout = 4200 }) {
  const id = nextId++
  const item = { id, type, title, message }

  notificationState.items.push(item)

  if (timeout) {
    window.setTimeout(() => dismissNotification(id), timeout)
  }

  return id
}

export function notifySuccess(message, title = 'Tudo certo') {
  return notify({ type: 'success', title, message })
}

export function notifyError(error, fallback = 'Não foi possível concluir a operação.') {
  const message = typeof error === 'string'
    ? error
    : error?.response?.data?.message || error?.message || fallback

  return notify({ type: 'error', title: 'Algo deu errado', message, timeout: 6200 })
}

export function dismissNotification(id) {
  const index = notificationState.items.findIndex(item => item.id === id)
  if (index >= 0) notificationState.items.splice(index, 1)
}
