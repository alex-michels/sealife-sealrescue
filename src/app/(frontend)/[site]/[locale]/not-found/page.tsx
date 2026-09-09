import { notFound } from 'next/navigation'

/** CR-16: proxy target for rejected locale paths. Must stay outside loading boundaries. */
export default function RejectedRoute() {
  notFound()
}
