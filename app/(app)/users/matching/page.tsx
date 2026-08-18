import { redirect } from "next/navigation"

/** Canonical matching UIs live under `/users/matching/students` and `/users/matching/teachers`. */
export default function UsersMatchingIndexPage() {
  redirect("/users/matching/students/")
}
