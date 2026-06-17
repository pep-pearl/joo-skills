import { logout } from "@acme/session";
export function LogoutButton() { return <button onClick={logout}>로그아웃</button>; }
