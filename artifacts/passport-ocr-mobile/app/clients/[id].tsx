import { Feather } from "@expo/vector-icons";
import {
  type Client,
  getListClientsQueryKey,
  useListClients,
} from "@workspace/api-client-react";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export default function ClientDetailScreen() {
  const colors = useColors();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);

  const { data, isLoading } = useListClients(undefined, {
    query: { queryKey: getListClientsQueryKey() },
  });

  const client = ((data ?? []) as Client[]).find((c) => c.id === id);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="user-x" size={28} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          Client not found
        </Text>
      </View>
    );
  }

  const fields: { label: string; value?: string | null; icon: keyof typeof Feather.glyphMap; action?: () => void }[] =
    [
      {
        label: "Contact person",
        value: client.contactPerson,
        icon: "user",
      },
      {
        label: "Phone",
        value: client.phone,
        icon: "phone",
        action: client.phone
          ? () => Linking.openURL(`tel:${client.phone}`)
          : undefined,
      },
      {
        label: "Email",
        value: client.email,
        icon: "mail",
        action: client.email
          ? () => Linking.openURL(`mailto:${client.email}`)
          : undefined,
      },
      { label: "Address", value: client.address, icon: "map-pin" },
      { label: "Notes", value: client.notes, icon: "file-text" },
    ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen options={{ title: client.name }} />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {client.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {client.name}
        </Text>
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>
          Client #{client.id}
        </Text>
      </View>

      <View
        style={[
          styles.group,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {fields.map((f, idx) => (
          <Pressable
            key={f.label}
            onPress={f.action}
            disabled={!f.action}
            style={({ pressed }) => [
              styles.row,
              {
                borderTopColor: colors.border,
                borderTopWidth: idx === 0 ? 0 : 1,
                opacity: f.action && pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name={f.icon} size={16} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                {f.label.toUpperCase()}
              </Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                {f.value || "—"}
              </Text>
            </View>
            {f.action ? (
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  header: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  muted: { fontSize: 12, fontFamily: "Inter_500Medium" },
  group: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  fieldValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 2 },
  errorText: { fontSize: 14, textAlign: "center", fontFamily: "Inter_500Medium" },
});
