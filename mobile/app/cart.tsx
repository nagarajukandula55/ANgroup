import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useCart } from "@/context/CartContext";

export default function CartScreen() {
  const { items, remove, total } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Your cart is empty.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name} × {item.quantity}</Text>
            <Text style={styles.price}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</Text>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{total.toLocaleString("en-IN")}</Text>
      </View>
      {/* Checkout wiring (address, Razorpay React Native SDK,
          /api/payment/verify) is a follow-up — this proves the
          browse -> add-to-cart pipeline end to end first. */}
      <Pressable style={styles.checkoutButton} disabled>
        <Text style={styles.checkoutText}>Checkout (coming soon)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  name: { flex: 1, fontSize: 14 },
  price: { fontSize: 14, fontWeight: "600", marginHorizontal: 8 },
  remove: { color: "#dc2626", fontSize: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "700" },
  checkoutButton: { backgroundColor: "#9ca3af", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 16 },
  checkoutText: { color: "#fff", fontWeight: "600" },
});
