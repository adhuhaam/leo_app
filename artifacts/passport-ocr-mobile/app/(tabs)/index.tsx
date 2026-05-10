import { Feather } from "@expo/vector-icons";
import {
  getGetPassportStatsQueryKey,
  getListExpensesQueryKey,
  type Passport,
  useGetPassportStats,
  useListExpenses,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

function formatMVR(n: number): string {
  return `MVR ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const { data: stats, isLoading, refetch, isFetching } = useGetPassportStats({
    query: { queryKey: getGetPassportStatsQueryKey() },
  });
  const { data: expenses = [] } = useListExpenses(undefined, {
    query: { queryKey: getListExpensesQueryKey() },
  });

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses],
  );
  const successRate =
    stats && stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  const recent = (stats?.recentUploads ?? []).slice(0, 5) as Passport[];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View>
        <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
          LEO OS
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Operational overview
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total"
              value={String(stats?.total ?? 0)}
              icon="layers"
              tint={colors.primary}
            />
            <StatCard
              label="Completed"
              value={String(stats?.completed ?? 0)}
              icon="check-circle"
              tint={colors.primary}
            />
            <StatCard
              label="Processing"
              value={String(stats?.processing ?? 0)}
              icon="loader"
              tint={colors.mutedForeground}
            />
            <StatCard
              label="Failed"
              value={String(stats?.failed ?? 0)}
              icon="alert-octagon"
              tint={colors.destructive}
            />
          </View>

          <View
            style={[
              styles.summary,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                Success rate
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {successRate}%
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                Bangladesh
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {stats?.bangladeshi ?? 0}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                India
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {stats?.indian ?? 0}
              </Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 4 }]}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                Total expenses
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {formatMVR(totalExpenses)}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <QuickAction
              icon="camera"
              label="New scan"
              onPress={() => router.push("/upload")}
            />
            <QuickAction
              icon="file-text"
              label="Billing"
              onPress={() => router.push("/billing")}
            />
            <QuickAction
              icon="users"
              label="Clients"
              onPress={() => router.push("/clients")}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent uploads
          </Text>
          <View style={{ gap: 10 }}>
            {recent.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Feather name="inbox" size={20} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No recent uploads.
                </Text>
              </View>
            ) : (
              recent.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/passport/${p.id}`)}
                  style={({ pressed }) => [
                    styles.recent,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.recentName, { color: colors.foreground }]}
                    >
                      {p.fullName || "Unnamed passport"}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.mutedForeground }]}>
                      {p.passportNumber || "—"} ·{" "}
                      {(p.status ?? "processing").toUpperCase()}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  tint: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={18} color={tint} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quick,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Feather name={icon} size={18} color={colors.primary} />
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  greeting: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 4 },
  loading: { padding: 40, alignItems: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  summary: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionsRow: { flexDirection: "row", gap: 10 },
  quick: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  quickLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  recent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  recentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  recentMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  emptyCard: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
