import { CardGridSkeleton } from '@/app/(frontend)/_components/ui/CardGridSkeleton'

/** Loading-граница списка раздела (M0-T19): скелет только у списка, не у детальных роутов. */
export default function Loading() {
  return <CardGridSkeleton header />
}
