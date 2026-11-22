import { redirect } from "next/navigation";

export default function Signin() {
  redirect("/?auth=signin");
}
