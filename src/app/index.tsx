import { Redirect } from "expo-router";

export default function index() {
  Redirect({ href: '/sign-up' });
  // Redirect({ href: '/sign-in' });
  return (
    <div>index</div>
  )
}
