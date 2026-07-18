import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { askAnu, AnuMessage } from "@/api/anu";

/**
 * Chat UI for ANu, the platform's existing in-house AI assistant (see
 * ANgroup's src/core/anu/anuService.ts). This is "the bot" — future bots
 * (e.g. one built specifically for an-communications-platform or
 * AN-Technologies) get added the same way: an entry in
 * src/config/services.ts + a thin api client like src/api/anu.ts + a
 * screen like this one, listed below instead of replacing it.
 */
export default function AssistantsScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AnuMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!user?.activeBusinessId) {
      setError("No active business on your account — ANu needs one to answer.");
      return;
    }

    const next = [...messages, { role: "user", content: text } as AnuMessage];
    setMessages(next);
    setInput("");
    setError(null);
    setBusy(true);

    try {
      const res = await askAnu(user.activeBusinessId, next);
      if (!res.success || res.error) {
        setError(res.error || "ANu couldn't answer that.");
      } else if (res.reply) {
        setMessages([...next, { role: "assistant", content: res.reply }]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to reach ANu");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            <Text style={item.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Ask ANu anything about your business.</Text>
        }
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message ANu..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
        />
        <Pressable style={styles.sendButton} onPress={send} disabled={busy}>
          <Text style={styles.sendButtonText}>{busy ? "..." : "Send"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1, padding: 16 },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
  bubble: { borderRadius: 10, padding: 10, marginBottom: 8, maxWidth: "85%" },
  bubbleUser: { backgroundColor: "#111", alignSelf: "flex-end" },
  bubbleAssistant: { backgroundColor: "#eee", alignSelf: "flex-start" },
  bubbleTextUser: { color: "#fff" },
  bubbleTextAssistant: { color: "#000" },
  error: { color: "#d33", paddingHorizontal: 16, paddingBottom: 4 },
  inputRow: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: "#eee" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  sendButton: { backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  sendButtonText: { color: "#fff", fontWeight: "600" },
});
