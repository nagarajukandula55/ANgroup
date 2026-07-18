import { View, Text, StyleSheet } from "react-native";

/**
 * Placeholder until an-communications-platform's chat API is wired in
 * (see src/config/services.ts — flip `enabled: true` once its baseUrl
 * and endpoints are known, then build the real message list/composer here).
 */
export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Chat</Text>
      <Text style={styles.body}>
        Not wired up yet — this will connect to an-communications-platform
        once that service's API is added to the service registry.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 14, color: "#666" },
});
