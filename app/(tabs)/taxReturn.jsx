// app/(tabs)/taxReturn.jsx
import React, { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useEmploymentIncome } from "../../hooks/useEmploymentIncome";
import { useBusinessIncome } from "../../hooks/useBusinessIncome";
import { useInvestmentIncome } from "../../hooks/useInvestmentIncome";
import { useQualifyingPayments } from "../../hooks/useQualifyingPayments";
import { useTaxPayments } from "../../hooks/useTaxPayments";

const TAX_YEAR = "2025-26";
const PERSONAL_RELIEF_CAP = 1_800_000;
const RENTAL_RELIEF_RATE = 0.25;

const SLABS = [
  { upTo: 1_000_000, rate: 0.06 },
  { upTo: 1_500_000, rate: 0.18 },
  { upTo: 2_000_000, rate: 0.24 },
  { upTo: 2_500_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.36 },
];

const fmt = (n) => n.toLocaleString();

export default function TaxReturnScreen() {
  const empQ = useEmploymentIncome(TAX_YEAR);
  const bizQ = useBusinessIncome(TAX_YEAR);
  const invQ = useInvestmentIncome(TAX_YEAR);
  const qpQ = useQualifyingPayments(TAX_YEAR);
  const taxQ = useTaxPayments(TAX_YEAR);

  const refreshing =
    empQ.isFetching ||
    bizQ.isFetching ||
    invQ.isFetching ||
    qpQ.isFetching ||
    taxQ.isFetching;

  const onRefresh = () => {
    empQ.refetch();
    bizQ.refetch();
    invQ.refetch();
    qpQ.refetch();
    taxQ.refetch();
  };

  const result = useMemo(() => {
    if (!empQ.data || !bizQ.data || !invQ.data || !qpQ.data || !taxQ.data)
      return null;

    const empIncome = empQ.data.months.reduce(
      (s, m) => s + (m.actualGross ?? m.gross),
      0
    );
    const paye = empQ.data.months.reduce(
      (s, m) => s + (m.actualPaye ?? m.paye),
      0
    );

    const bizIncome = bizQ.data.transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const bizExpense = bizQ.data.transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const bizNet = bizIncome - bizExpense;

    const invBase = {
      Rent: { amt: 0, wht: 0 },
      Interest: { amt: 0, wht: 0 },
      Dividend: { amt: 0, wht: 0 },
      Other: { amt: 0, wht: 0 },
    };
    const inv = invQ.data.lines.reduce((acc, l) => {
      const k = acc[l.type] ? l.type : "Other";
      acc[k].amt += l.amount;
      acc[k].wht += l.wht;
      return acc;
    }, invBase);

    const assessable =
      empIncome + bizNet + inv.Rent.amt + inv.Interest.amt + inv.Other.amt;

    const personalRelief = Math.min(PERSONAL_RELIEF_CAP, assessable);
    const rentalRelief = inv.Rent.amt * RENTAL_RELIEF_RATE;
    const qpRelief = qpQ.data.lines.reduce((s, l) => s + l.deductible, 0);
    const reliefTotal = personalRelief + rentalRelief + qpRelief;

    const taxable = Math.max(0, assessable - reliefTotal);

    const bands = [];
    let prevUpper = 0;
    let remain = taxable;
    let tax = 0;
    for (const slab of SLABS) {
      const width = slab.upTo === Infinity ? Infinity : slab.upTo - prevUpper;
      const bandAmt = Math.min(remain, width);
      const bandTax = bandAmt * slab.rate;
      bands.push({ ...slab, lower: prevUpper, bandAmt, bandTax });
      tax += bandTax;
      remain -= bandAmt;
      prevUpper = slab.upTo;
      if (remain <= 0) break;
    }

    const whtTotal = inv.Rent.wht + inv.Interest.wht + inv.Other.wht;
    const taxPaid = taxQ.data.payments.reduce((s, p) => s + p.amount, 0);
    const credits = paye + whtTotal + taxPaid;
    const balance = tax - credits;

    return {
      empIncome,
      bizNet,
      inv,
      assessable,
      personalRelief,
      rentalRelief,
      qpRelief,
      reliefTotal,
      taxable,
      bands,
      tax,
      paye,
      whtTotal,
      taxPaid,
      credits,
      balance,
    };
  }, [empQ.data, bizQ.data, invQ.data, qpQ.data, taxQ.data]);

  if (!result)
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ActivityIndicator size="large" />
      </ScrollView>
    );

  const r = result;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.h1}>Tax Return – {TAX_YEAR}</Text>

      {/* assessable */}
      <Section title="Assessable Income">
        <Row label="Employment Income" value={r.empIncome} />
        <Row label="Business Income (net)" value={r.bizNet} />
        <Row
          label="Investment Income"
          value={r.inv.Rent.amt + r.inv.Interest.amt + r.inv.Other.amt}
        />
        <Row label="  · Rent" value={r.inv.Rent.amt} indent />
        <Row label="  · Interest" value={r.inv.Interest.amt} indent />
        <Row label="  · Other" value={r.inv.Other.amt} indent />
        <Row label="Total Assessable Income" value={r.assessable} bold />
      </Section>

      {/* reliefs */}
      <Section title="Reliefs & Qualifying Payments">
        <Row label="Personal Relief" value={r.personalRelief} />
        <Row label="Rental Relief" value={r.rentalRelief} />
        <Row label="Qualifying Payments" value={r.qpRelief} />
        <Row label="Total Reliefs" value={r.reliefTotal} bold />
      </Section>

      {/* taxable */}
      <Section title="Taxable Income">
        <Row label="Taxable Income" value={r.taxable} bold />
      </Section>

      {/* slabs */}
      <Section title="Tax Slabs">
        {r.bands.map((b, i) => (
          <Row
            key={i}
            label={`${b.lower.toLocaleString()} – ${
              b.upTo === Infinity ? "∞" : b.upTo.toLocaleString()
            }  @ ${(b.rate * 100).toFixed(0)}%`}
            value={b.bandTax}
            muted={!b.bandAmt}
          />
        ))}
        <Row label="Total Tax Liability" value={r.tax} bold />
      </Section>

      {/* credits */}
      <Section title="Tax Credits & Payments">
        <Row label="PAYE" value={r.paye} />
        <Row label="WHT (Rent + Interest + Other)" value={r.whtTotal} />
        <Row label="Tax Payments (Q1‑Q4 + Final)" value={r.taxPaid} />
        <Row label="Total Credits" value={r.credits} bold />
      </Section>

      {/* balance */}
      <Section title="Balance Payable / (Refund)">
        <Row label="Balance" value={r.balance} bold />
      </Section>
    </ScrollView>
  );
}

const Row = ({ label, value, bold, indent, muted }) => (
  <View style={styles.row}>
    <Text
      style={[
        styles.rowLabel,
        indent && { marginLeft: 12 },
        bold && { fontWeight: "700" },
        muted && { color: "#888" },
      ]}
    >
      {label}
    </Text>
    <Text
      style={[
        styles.rowVal,
        bold && { fontWeight: "700" },
        muted && { color: "#888" },
      ]}
    >
      {fmt(value)}
    </Text>
  </View>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.secTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  h1: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  section: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    gap: 4,
    backgroundColor: "#fff",
  },
  secTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { fontSize: 14 },
  rowVal: { fontSize: 14, textAlign: "right", minWidth: 120 },
});
