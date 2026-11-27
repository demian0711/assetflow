const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })
const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })

export const formatDate = (value: string) => date.format(new Date(value))
export const formatDateTime = (value: string) => dateTime.format(new Date(value))
