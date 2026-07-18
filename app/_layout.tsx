import { Redirect, Slot, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function Gate() {
  const { isLoading, isSignedIn } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "login";

  if (isLoading) return null;

  if (!isSignedIn && !inAuthGroup) {
    return <Redirect href="/login" />;
  }
  if (isSignedIn && inAuthGroup) {
    return <Redirect href="/" />;
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Gate />
    </AuthProvider>
  );
}
