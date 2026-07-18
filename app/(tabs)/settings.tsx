import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { SERVICES } from "@/config/services";

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Registered Services</Text>
      {SERVICES.map((s) => (
        <Text key={s.id} style={styles.item}>
          {s.enabled ? "✅" : "⬜️"} {s.label} — {s.repo}
        </Text>
      ))}

      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  item: { fontSize: 14, color: "#444", marginBottom: 4 },
  button: {
    backgroundColor: "#d33",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
