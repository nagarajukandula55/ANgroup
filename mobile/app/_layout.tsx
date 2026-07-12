import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerTitleAlign: "center" }}>
          <Stack.Screen name="index" options={{ title: "AN Group" }} />
          <Stack.Screen name="login" options={{ title: "Sign In" }} />
          <Stack.Screen name="product/[slug]" options={{ title: "Product" }} />
          <Stack.Screen name="cart" options={{ title: "Cart" }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
