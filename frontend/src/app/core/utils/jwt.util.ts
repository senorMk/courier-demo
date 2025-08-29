import { jwtDecode } from "jwt-decode";

export interface JwtPayload {
  // Add other properties as needed
  role?: string;
  [key: string]: any;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch (e) {
    console.error("Invalid JWT:", e);
    return null;
  }
}
