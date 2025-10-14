import { redirect } from "next/navigation";

export default function Page() {
  redirect("http://localhost:3000/dashboard/sites");
  // You can optionally return null or nothing.
  return null;
}