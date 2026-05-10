import { Feather } from "@expo/vector-icons";
import {
  type BillingDocument,
  type BillingItem,
  getGetBillingDocumentQueryKey,
  useGetBillingDocument,
} from "@workspace/api-client-react";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

function fmtMVR(s: string | number): string {
  const n = typeof s === "string" ? Number(s) : s;
  return `MVR ${(isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BillingDetailScreen() {
  const colors = useColors();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);

  const { data, isLoading, isError, error, refetch } = useGetBillingDocument(
    id,
    {
      query: {
        enabled: !Number.isNaN(id),
        queryKey: getGetBillingDocumentQueryKey(id),
      },
    },
  );

  const totals = useMemo(() => {
    const doc = data as BillingDocument | undefined;
    if (!doc) return { sub: 0, gst: 0, total: 0 };
    const sub = doc.items.reduce(
      (s, it) => s + Number(it.qty || 0) * Number(it.rate || 0),
      0,
    );
    const rate = Number(doc.gstRate || 0) / 100;
    if (doc.gstInclusive) {
      const base = sub / (1 + rate);
      const gst = sub - base;
      return { sub: base, gst, total: sub };
    }
    const gst = sub * rate;
    return { sub, gst, total: sub + gst };
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-triangle" size={28} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          {error instanceof Error ? error.message : "Document not found"}
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  const doc = data as BillingDocument;
  const isInvoice = doc.kind === "invoice";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen
        options={{ title: `${isInvoice ? "Invoice" : "Quote"} ${doc.number}` }}
      />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.kindBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.kindText, { color: colors.primary }]}>
            {isInvoice ? "INVOICE" : "QUOTE"}
          </Text>
        </View>
        <Text style={[styles.docNumber, { color: colors.foreground }]}>
          {doc.number}
        </Text>
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>
          From {doc.companyName}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <FieldRow label="Customer" value={doc.customerName} />
        {doc.customerAddress ? (
          <FieldRow label="Address" value={doc.customerAddress} />
        ) : null}
        {doc.customerTin ? (
          <FieldRow label="TIN" value={doc.customerTin} />
        ) : null}
        <FieldRow label="Issue date" value={doc.issueDate} />
        {doc.dueDate ? <FieldRow label="Due date" value={doc.dueDate} /> : null}
        <FieldRow label="Status" value={doc.status.toUpperCase()} />
        {doc.terms ? <FieldRow label="Terms" value={doc.terms} /> : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Items
      </Text>
      <View style={{ gap: 8 }}>
        {doc.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </View>

      <View
        style={[
          styles.totals,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TotalRow label="Subtotal" value={fmtMVR(totals.sub)} />
        <TotalRow
          label={`GST (${doc.gstRate}%${doc.gstInclusive ? ", incl." : ""})`}
          value={fmtMVR(totals.gst)}
        />
        <View style={[styles.totalDivider, { backgroundColor: colors.border }]} />
        <TotalRow label="Total" value={fmtMVR(totals.total)} bold />
      </View>

      {doc.notes ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
            NOTES
          </Text>
          <Text style={[styles.fieldValue, { color: colors.foreground }]}>
            {doc.notes}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.viewOnlyHint,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="eye" size={14} color={colors.mutedForeground} />
        <Text style={[styles.viewOnlyText, { color: colors.mutedForeground }]}>
          View only — manage on the web dashboard.
        </Text>
      </View>
    </ScrollView>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.fieldValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

function ItemRow({ item }: { item: BillingItem }) {
  const colors = useColors();
  const lineTotal = Number(item.qty || 0) * Number(item.rate || 0);
  return (
    <View
      style={[
        styles.item,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemDesc, { color: colors.foreground }]}>
          {item.description}
        </Text>
        {item.detail ? (
          <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
            {item.detail}
          </Text>
        ) : null}
        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
          {item.qty} × {fmtMVR(item.rate)}
        </Text>
      </View>
      <Text style={[styles.itemTotal, { color: colors.foreground }]}>
        {fmtMVR(lineTotal)}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.totalRow}>
      <Text
        style={[
          styles.totalLabel,
          {
            color: bold ? colors.foreground : colors.mutedForeground,
            fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium",
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.totalValue,
          {
            color: colors.foreground,
            fontFamily: bold ? "Inter_700Bold" : "Inter_600SemiBold",
            fontSize: bold ? 18 : 14,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  header: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  kindBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kindText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  docNumber: { fontSize: 22, fontFamily: "Inter_700Bold" },
  muted: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  fieldValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  itemDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totals: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 14 },
  totalDivider: { height: 1, marginVertical: 4 },
  viewOnlyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  viewOnlyText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 14, textAlign: "center", fontFamily: "Inter_500Medium" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
