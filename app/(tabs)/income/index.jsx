import React, { useMemo } from "react";
import { Link } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import COLORS from "../../../constants/colors";
import { useEmploymentIncome } from "../../../hooks/useEmploymentIncome";
import { useBusinessIncome } from "../../../hooks/useBusinessIncome";
import { useInvestmentIncome } from "../../../hooks/useInvestmentIncome";
import { useQualifyingPayments } from "../../../hooks/useQualifyingPayments";
import { useTaxPayments } from "../../../hooks/useTaxPayments";

const TAX_YEAR = "2025-26";
const PERSONAL_RELIEF_CAP = 1_800_000;

export default function IncomeHome() {
  const {
    data: emp,
    isFetching: empFetching,
    refetch: rEmp,
  } = useEmploymentIncome(TAX_YEAR);
  const {
    data: biz,
    isFetching: bizFetching,
    refetch: rBiz,
  } = useBusinessIncome(TAX_YEAR);
  const {
    data: inv,
    isFetching: invFetching,
    refetch: rInv,
  } = useInvestmentIncome(TAX_YEAR);
  const {
    data: qp,
    isFetching: qpFetching,
    refetch: rQp,
  } = useQualifyingPayments(TAX_YEAR);

  /* fetch */
  const {
    data: tax,
    isFetching: taxFetching,
    refetch: rTax,
  } = useTaxPayments(TAX_YEAR);

  const refreshing =
    empFetching || bizFetching || invFetching || qpFetching || taxFetching;
  const onRefresh = () => {
    rEmp();
    rBiz();
    rInv();
    rQp();
    rTax();
  };

  const { empIncome, empPaye } = useMemo(() => {
    if (!emp) return { empIncome: 0, empPaye: 0 };
    return emp.months.reduce(
      (acc, m) => ({
        empIncome: acc.empIncome + (m.actualGross ?? m.gross),
        empPaye: acc.empPaye + (m.actualPaye ?? m.paye),
      }),
      { empIncome: 0, empPaye: 0 }
    );
  }, [emp]);

  const { bizIncome, bizExpense } = useMemo(() => {
    if (!biz) return { bizIncome: 0, bizExpense: 0 };
    return biz.transactions.reduce(
      (acc, t) =>
        t.type === "income"
          ? { ...acc, bizIncome: acc.bizIncome + t.amount }
          : { ...acc, bizExpense: acc.bizExpense + t.amount },
      { bizIncome: 0, bizExpense: 0 }
    );
  }, [biz]);
  const bizNet = bizIncome - bizExpense;

  const invSum = useMemo(() => {
    const base = {
      Rent: { amt: 0, wht: 0 },
      Interest: { amt: 0, wht: 0 },
      Dividend: { amt: 0, wht: 0 },
      Other: { amt: 0, wht: 0 },
    };
    if (!inv) return base;
    return inv.lines.reduce((acc, l) => {
      const key = acc[l.type] ? l.type : "Other";
      acc[key].amt += l.amount;
      acc[key].wht += l.wht;
      return acc;
    }, base);
  }, [inv]);

  const qpSum = useMemo(() => {
    const base = {
      Solar: { a: 0, d: 0 },
      Charity: { a: 0, d: 0 },
      Government: { a: 0, d: 0 },
    };
    if (!qp) return base;
    qp.lines.forEach((l) => {
      base[l.type].a += l.amount;
      base[l.type].d += l.deductible;
    });
    return base;
  }, [qp]);

  const totalGrossIncome =
    empIncome +
    bizNet +
    invSum.Rent.amt +
    invSum.Interest.amt +
    invSum.Other.amt;

  const personalRelief = Math.min(totalGrossIncome, PERSONAL_RELIEF_CAP);
  const rentalRelief = invSum.Rent.amt * 0.25;

  const taxTotals = useMemo(() => {
    const base = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Final: 0 };
    if (!tax) return base;
    tax.payments.forEach((p) => (base[p.type] += p.amount));
    return base;
  }, [tax]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.h1}>Income Summary ({TAX_YEAR})</Text>

      {/* EMPLOYMENT */}
      <SummaryCard
        href="/income/employment"
        loading={empFetching && !emp}
        title="Employment Income"
        lines={[
          `Total Income: ${empIncome.toLocaleString()}`,
          `PAYE: ${empPaye.toLocaleString()}`,
        ]}
      />

      {/* BUSINESS */}
      <SummaryCard
        href="/income/business"
        loading={bizFetching && !biz}
        title="Business Income"
        lines={[
          `Income: ${bizIncome.toLocaleString()}`,
          `Expense: ${bizExpense.toLocaleString()}`,
          `Net: ${bizNet.toLocaleString()}`,
        ]}
      />

      {/* INVESTMENT */}
      <SummaryCard
        href="/income/investment"
        loading={invFetching && !inv}
        title="Investment Income"
        lines={[
          `Rent: ${invSum.Rent.amt.toLocaleString()}  (WHT ${invSum.Rent.wht.toLocaleString()})`,
          `Interest: ${invSum.Interest.amt.toLocaleString()}  (WHT ${invSum.Interest.wht.toLocaleString()})`,
          `Dividend: ${invSum.Dividend.amt.toLocaleString()}  (Final WHT ${invSum.Dividend.wht.toLocaleString()})`,
          invSum.Other.amt
            ? `Other: ${invSum.Other.amt.toLocaleString()}  (WHT ${invSum.Other.wht.toLocaleString()})`
            : null,
        ].filter(Boolean)}
      />

      {/* QUALIFYING PAYMENTS */}
      <SummaryCard
        href="/income/qualifying"
        loading={qpFetching && !qp}
        title="Qualifying Payments"
        lines={[
          `Solar: ${qpSum.Solar.a.toLocaleString()}  (Ded ${qpSum.Solar.d.toLocaleString()})`,
          `Charity: ${qpSum.Charity.a.toLocaleString()}  (Ded ${qpSum.Charity.d.toLocaleString()})`,
          `Government: ${qpSum.Government.a.toLocaleString()}  (Ded ${qpSum.Government.d.toLocaleString()})`,
        ]}
      />

      {/* TAX Payments */}
      <SummaryCard
        href="/income/tax"
        loading={taxFetching && !tax}
        title="Tax Payments"
        lines={["Q1", "Q2", "Q3", "Q4", "Final"].map(
          (q) => `${q}: ${taxTotals[q].toLocaleString()}`
        )}
      />

      {/* RELIEFS */}
      <View style={[styles.card, { backgroundColor: COLORS.primary }]}>
        <Text style={styles.cardTitle}>Automatic Reliefs</Text>
        <Text style={styles.cardLine}>
          Personal Relief (max 1.8 M): {personalRelief.toLocaleString()}
        </Text>
        <Text style={styles.cardLine}>
          Rental Relief (25 % of rent): {rentalRelief.toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
}

function SummaryCard({ href, loading, title, lines }) {
  return (
    <Link href={href} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 6 }} />
          ) : (
            lines.map((l, i) => (
              <Text key={i} style={styles.cardLine}>
                {l}
              </Text>
            ))
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  h1: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cardLine: { color: "#fff", marginTop: 4 },
});
