// app/(tabs)/index.js
import React, { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Image,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useEmploymentIncome } from "../../hooks/useEmploymentIncome";
import { useBusinessIncome } from "../../hooks/useBusinessIncome";
import { useInvestmentIncome } from "../../hooks/useInvestmentIncome";
import { useTaxPayments } from "../../hooks/useTaxPayments";
import { useAlerts } from "../../hooks/useAlerts";
import COLORS from "../../constants/colors";

const TAX_YEAR = "2025-26";

export default function Home() {
  // User
  const user = useAuthStore((s) => s.user || { name: "User" });

  // Employment
  const {
    data: emp,
    isFetching: empFetching,
    refetch: refetchEmp,
  } = useEmploymentIncome(TAX_YEAR);
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

  // Business
  const {
    data: biz,
    isFetching: bizFetching,
    refetch: refetchBiz,
  } = useBusinessIncome(TAX_YEAR);
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

  // Investment
  const {
    data: inv,
    isFetching: invFetching,
    refetch: refetchInv,
  } = useInvestmentIncome(TAX_YEAR);
  const { invTotal, invWHT } = useMemo(() => {
    if (!inv) return { invTotal: 0, invWHT: 0 };
    const sum = inv.lines.reduce(
      (acc, l) => ({
        invTotal: acc.invTotal + l.amount,
        invWHT: acc.invWHT + l.wht,
      }),
      { invTotal: 0, invWHT: 0 }
    );
    return sum;
  }, [inv]);

  // Tax payments
  const {
    data: tax,
    isFetching: taxFetching,
    refetch: refetchTax,
  } = useTaxPayments(TAX_YEAR);
  const taxPaid = useMemo(() => {
    if (!tax) return 0;
    return tax.payments.reduce((s, p) => s + p.amount, 0);
  }, [tax]);

  // Alerts (static/local)
  const {
    data: alertsData,
    isFetching: alertsFetching,
    refetch: refetchAlerts,
  } = useAlerts();
  const alerts = useMemo(() => {
    if (!alertsData) return [];
    const all = alertsData.pages.flat();
    return all.slice(0, 5);
  }, [alertsData]);

  // Combined refresh
  const refreshing =
    empFetching || bizFetching || invFetching || taxFetching || alertsFetching;
  const onRefresh = () => {
    refetchEmp();
    refetchBiz();
    refetchInv();
    refetchTax();
    refetchAlerts();
  };

  const fmt = (n) => n.toLocaleString();

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={{ fontSize: 14, color: COLORS.primary }}>
            Hey, {user.username}!
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{ fontWeight: 700, fontSize: 20, color: COLORS.primary }}
            >
              Welcome to
            </Text>
            <Image
              source={require("../../assets/images/taxactly-logo.png")}
              style={{ width: 90, height: 25, marginTop: 5, marginLeft: 3 }}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={styles.assessYear}>{TAX_YEAR}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Employment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employment Income</Text>
          <Text style={styles.cardLine}>
            Total Actual Income: {fmt(empIncome)}
          </Text>
          <Text style={styles.cardLine}>PAYE: {fmt(empPaye)}</Text>
        </View>

        {/* Business */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Income</Text>
          <Text style={styles.cardLine}>Income: {fmt(bizIncome)}</Text>
          <Text style={styles.cardLine}>Expense: {fmt(bizExpense)}</Text>
          <Text style={[styles.cardLine, styles.bold]}>
            Profit/Loss: {fmt(bizNet)}
          </Text>
        </View>

        {/* Investment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Investment Income</Text>
          <Text style={styles.cardLine}>Total Income: {fmt(invTotal)}</Text>
          <Text style={styles.cardLine}>WHT: {fmt(invWHT)}</Text>
        </View>

        {/* Tax payments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tax Payments Made</Text>
          <Text style={styles.cardLine}>{fmt(taxPaid)}</Text>
        </View>

        {/* Upcoming deadlines */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming Deadlines</Text>
          <Text style={styles.cardLine}>Q1 Payment – 15 August 2025</Text>
          <Text style={styles.cardLine}>Q2 Payment – 15 November 2025</Text>
          <Text style={styles.cardLine}>
            2024/25 Tax Return – 30 November 2025
          </Text>
        </View>

        {/* News Alerts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Notices</Text>
          {alerts.map((n, i) => (
            <TouchableOpacity
              key={i}
              style={styles.notice}
              onPress={() => n.href && Linking.openURL(n.href)}
              disabled={!n.href}
            >
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeDate}>{n.date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    paddingVertical: 10,
  },
  headerContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: "#f2f2f2",
  },
  welcome: {
    fontSize: 20,
    fontWeight: "600",
  },
  assessYear: {
    fontSize: 16,
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardLine: {
    marginTop: 6,
    fontSize: 14,
  },
  bold: {
    fontWeight: "700",
  },
  notice: {
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderColor: "#ddd",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeDate: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
});
