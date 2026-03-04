import axios from 'axios'

export const http = axios.create({
  withCredentials: true,
  validateStatus: () => true,
})

export function isErrorStatus(status) {
  return status < 200 || status >= 300
}
