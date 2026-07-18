import { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet, RefreshControl } from "react-native";
import { enabledServices } from "@/config/services";
import { fetchDashboardOverview, DashboardOverview } from "@/api/dashboard";

export default function DashboardScreen() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await fetchDashboardOverview();
      setOverview(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dashboard");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>Connected Services</Text>
      {enabledServices().map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>{s.label}</Text>
          <Text style={styles.cardSub}>{s.repo}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>ANgroup Overview</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && !overview && <Text style={styles.cardSub}>Loading...</Text>}
      {overview && (
        <View style={styles.card}>
          <Text style={styles.cardSub}>{JSON.stringify(overview, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSub: { fontSize: 13, color: "#666", marginTop: 4 },
  error: { color: "#d33" },
});
