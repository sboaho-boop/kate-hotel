import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

export type ReportPayment = {
  time: string;
  guest: string;
  room: string;
  method: string;
  amount: number;
};

export type ReportStay = {
  time: string;
  guest: string;
  phone: string;
  room: string;
  card: string | null;
  amount: number;
  status: "PAID" | "UNPAID";
};

export type ReportData = {
  hotelName: string;
  staffName: string;
  shiftId: string;
  startedAt: string;
  endedAt: string;
  summary: {
    checkIns: number;
    paymentsCount: number;
    totalCollected: number;
    unpaidTotal: number;
  };
  checkIns: ReportStay[];
  payments: ReportPayment[];
  unpaidGuests: ReportStay[];
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "bold", color: "#312e81" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 4 },
  hr: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 6, marginTop: 14 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 4 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingVertical: 4, fontWeight: "bold" },
  col: { flex: 1, paddingRight: 6 },
  colSmall: { width: 60, paddingRight: 6 },
  colMid: { width: 90, paddingRight: 6 },
  summaryGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, padding: 8 },
  summaryLabel: { fontSize: 8, color: "#6b7280" },
  summaryValue: { fontSize: 16, fontWeight: "bold", marginTop: 2 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center" },
  money: { textAlign: "right" },
});

function Currency({ value }: { value: number }) {
  return <Text style={styles.money}>KES {value.toLocaleString()}</Text>;
}

export function ShiftReportDocument({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.hotelName}</Text>
          <Text style={styles.subtitle}>End of Shift Report</Text>
          <Text style={styles.subtitle}>
            Shift #{data.shiftId} · Staff: {data.staffName}
          </Text>
          <Text style={styles.subtitle}>
            {data.startedAt} → {data.endedAt}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Check-ins</Text>
            <Text style={styles.summaryValue}>{data.summary.checkIns}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Payments</Text>
            <Text style={styles.summaryValue}>{data.summary.paymentsCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={styles.summaryValue}>
              KES {data.summary.totalCollected.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Unpaid total</Text>
            <Text style={styles.summaryValue}>
              KES {data.summary.unpaidTotal.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Check-ins during shift</Text>
        {data.checkIns.length === 0 ? <Text style={{ color: "#9ca3af" }}>No check-ins this shift.</Text> : (
          <View>
            <View style={styles.th}>
              <Text style={styles.colSmall}>Time</Text>
              <Text style={styles.col}>Guest</Text>
              <Text style={styles.colMid}>Room</Text>
              <Text style={styles.colMid}>NFC card</Text>
              <Text style={styles.col}>Amount</Text>
              <Text style={styles.colSmall}>Status</Text>
            </View>
            {data.checkIns.map((s, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.colSmall}>{s.time}</Text>
                <Text style={styles.col}>{s.guest}</Text>
                <Text style={styles.colMid}>{s.room}</Text>
                <Text style={styles.colMid}>{s.card ?? "—"}</Text>
                <Currency value={s.amount} />
                <Text style={styles.colSmall}>{s.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Payments recorded</Text>
        {data.payments.length === 0 ? <Text style={{ color: "#9ca3af" }}>No payments recorded this shift.</Text> : (
          <View>
            <View style={styles.th}>
              <Text style={styles.colSmall}>Time</Text>
              <Text style={styles.col}>Guest</Text>
              <Text style={styles.colMid}>Room</Text>
              <Text style={styles.colMid}>Method</Text>
              <Text style={styles.col}>Amount</Text>
            </View>
            {data.payments.map((p, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.colSmall}>{p.time}</Text>
                <Text style={styles.col}>{p.guest}</Text>
                <Text style={styles.colMid}>{p.room}</Text>
                <Text style={styles.colMid}>{p.method}</Text>
                <Currency value={p.amount} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Unpaid guests to follow up</Text>
        {data.unpaidGuests.length === 0 ? <Text style={{ color: "#9ca3af" }}>All guests paid. </Text> : (
          <View>
            {data.unpaidGuests.map((s, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.col}>{s.guest}</Text>
                <Text style={styles.colMid}>{s.phone}</Text>
                <Text style={styles.colMid}>Room {s.room}</Text>
                <Currency value={s.amount} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>Generated by Hotel HMS · {data.endedAt}</Text>
      </Page>
    </Document>
  );
}

export async function renderShiftReportPdf(data: ReportData): Promise<Buffer> {
  const blob = await pdf(<ShiftReportDocument data={data} />).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
