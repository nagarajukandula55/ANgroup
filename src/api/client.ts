import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { ServiceDefinition } from "@/config/services";

const TOKEN_KEY = "an_command_auth_token";
const USER_KEY = "an_command_auth_user";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  isPlatformStaff: boolean;
  activeBusinessId?: string;
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setStoredUser(user: StoredUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

function baseUrlFor(service: ServiceDefinition): string {
  const extra = Constants.expoConfig?.extra ?? {};
  const url = extra[service.baseUrlEnvKey];
  if (!url) {
    throw new Error(
      `Missing app.json extra.${service.baseUrlEnvKey} for service "${service.id}"`
    );
  }
  return url;
}

export async function serviceFetch<T>(
  service: ServiceDefinition,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${baseUrlFor(service)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${service.id} ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}
