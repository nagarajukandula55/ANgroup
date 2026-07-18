import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { ServiceDefinition } from "@/config/services";

const TOKEN_KEY = "an_command_auth_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
