import { SERVICES } from "@/config/services";
import { serviceFetch } from "@/api/client";

const angroup = SERVICES.find((s) => s.id === "angroup")!;

interface LoginResponse {
  success: boolean;
  token: string;
  message?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuperAdmin: boolean;
    isPlatformStaff: boolean;
    activeBusinessId?: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await serviceFetch<LoginResponse>(angroup, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.success) {
    throw new Error(res.message || "Login failed");
  }
  return res;
}
