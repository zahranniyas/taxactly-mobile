import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
  useEmploymentIncome,
  useCreateEmploymentIncome,
  useUpdateMonth,
  useUpdateEmploymentIncomeHeader,
} from "../../../hooks/useEmploymentIncome";

const MONTHS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

export default function EmploymentIncomeScreen() {
  const router = useRouter();

  const { data, refetch, isFetching } = useEmploymentIncome("2025-26");

  const createIncome = useCreateEmploymentIncome();
  const updateIncome = useUpdateEmploymentIncomeHeader();
  const updateMonth = useUpdateMonth();

  const [formOpen, setFormOpen] = useState(true);
  const [form, setForm] = useState({
    companyName: "",
    employeeId: "",
    regularMonthlySalary: "",
    isPrimary: true,
    taxYear: "2025-26",
  });

  useEffect(() => {
    if (data) {
      setForm((p) => ({
        ...p,
        companyName: data.companyName,
        employeeId: data.employeeId,
        regularMonthlySalary: data.regularMonthlySalary.toString(),
        isPrimary: data.isPrimary,
      }));
    }
  }, [data]);

  const handleChange = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const scrollRef = useRef(null);
  const isGenerating = createIncome.isLoading || updateIncome.isLoading;

  const onGenerate = () => {
    const payload = {
      ...form,
      regularMonthlySalary: Number(form.regularMonthlySalary),
    };

    const afterSuccess = () => {
      refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    };

    if (data?._id) {
      updateIncome.mutate(
        { id: data._id, payload },
        { onSuccess: afterSuccess }
      );
    } else {
      createIncome.mutate(payload, { onSuccess: afterSuccess });
    }
  };

  const [isActual, setIsActual] = useState(false);

  const { totalGross, totalPaye } = useMemo(() => {
    if (!data) return { totalGross: 0, totalPaye: 0 };
    return data.months.reduce(
      (acc, m) => {
        const gross = isActual ? m.actualGross ?? m.gross : m.gross;
        const paye = isActual ? m.actualPaye ?? m.paye : m.paye;
        return {
          totalGross: acc.totalGross + gross,
          totalPaye: acc.totalPaye + paye,
        };
      },
      { totalGross: 0, totalPaye: 0 }
    );
  }, [data, isActual]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} />
      }
    >
      {/* Collapsible header */}
      <Pressable
        style={styles.cardHeader}
        onPress={() => setFormOpen((o) => !o)}
      >
        <Text style={styles.h2}>Employment Income</Text>
        <Text style={styles.chevron}>{formOpen ? "▲" : "▼"}</Text>
      </Pressable>

      {formOpen && (
        <View style={styles.cardBody}>
          <TextInput
            placeholder="Company"
            value={form.companyName}
            onChangeText={handleChange("companyName")}
            style={styles.input}
          />
          <TextInput
            placeholder="Employee ID"
            value={form.employeeId}
            onChangeText={handleChange("employeeId")}
            style={styles.input}
          />
          <TextInput
            placeholder="Monthly salary"
            keyboardType="numeric"
            value={form.regularMonthlySalary}
            onChangeText={handleChange("regularMonthlySalary")}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.genBtn, isGenerating && styles.btnDisabled]}
            activeOpacity={0.7}
            onPress={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.genTxt}>
                {data ? "Re‑generate" : "Generate"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {data && (
        <View style={{ marginTop: 24 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.h3}>Monthly breakdown</Text>
            <View style={styles.rowBetween}>
              <Text>Est</Text>
              <Switch value={isActual} onValueChange={setIsActual} />
              <Text>Act</Text>
            </View>
          </View>

          {/* headings */}
          <View style={[styles.tRow, styles.tHead]}>
            <Text style={styles.tCell}>Month</Text>
            <Text style={styles.tCell}>Salary</Text>
            <Text style={styles.tCellR}>PAYE</Text>
            <Text style={[styles.tCell, { width: 60 }]} />
          </View>

          <FlatList
            data={data.months}
            keyExtractor={(m) => m.monthIndex.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.tRow}>
                <Text style={styles.tCell}>{MONTHS[item.monthIndex]}</Text>

                {isActual ? (
                  <TextInput
                    defaultValue={(item.actualGross ?? item.gross).toString()}
                    keyboardType="numeric"
                    style={[styles.tCell, styles.edit]}
                    onEndEditing={(e) =>
                      updateMonth.mutate({
                        id: data._id,
                        idx: item.monthIndex,
                        data: { actualGross: Number(e.nativeEvent.text) },
                      })
                    }
                  />
                ) : (
                  <Text style={styles.tCell}>
                    {item.gross.toLocaleString()}
                  </Text>
                )}

                <Text style={styles.tCellR}>
                  {(isActual
                    ? item.actualPaye ?? item.paye
                    : item.paye
                  ).toLocaleString()}
                </Text>

                <Pressable
                  style={{ marginLeft: 12 }}
                  onPress={async () => {
                    if (item.payslipUrl) {
                      router.push({
                        pathname: "/viewer",
                        params: { url: item.payslipUrl },
                      });
                    } else {
                      const doc = await DocumentPicker.getDocumentAsync({
                        type: ["application/pdf", "image/*"],
                        copyToCacheDirectory: true,
                      });
                      if (doc.type === "success") {
                        const formData = new FormData();
                        formData.append("payslip", {
                          uri: doc.fileCopyUri ?? doc.uri,
                          name:
                            doc.name ??
                            `payslip.${doc.mimeType?.split("/")[1] || "pdf"}`,
                          type: doc.mimeType || "application/octet-stream",
                        });
                        updateMonth.mutate({
                          id: data._id,
                          idx: item.monthIndex,
                          data: formData,
                        });
                      }
                    }
                  }}
                >
                  <Text style={{ color: "blue" }}>
                    {item.payslipUrl ? "View" : "Upload"}
                  </Text>
                </Pressable>
              </View>
            )}
          />

          <View style={[styles.tRow, styles.totalRow]}>
            <Text style={styles.tCell}>Total</Text>
            <Text style={styles.tCell}>{totalGross.toLocaleString()}</Text>
            <Text style={styles.tCellR}>{totalPaye.toLocaleString()}</Text>
            <Text style={{ width: 60 }} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  cardBody: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#ddd",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#fff",
  },
  chevron: { fontSize: 16, fontWeight: "600" },

  h2: { fontSize: 20, fontWeight: "600" },
  h3: { fontSize: 18, fontWeight: "600" },

  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 },

  genBtn: {
    marginTop: 4,
    backgroundColor: "#0066cc",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  genTxt: { color: "#fff", fontWeight: "600" },
  btnDisabled: { opacity: 0.65 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  tHead: { borderBottomWidth: 1, backgroundColor: "#f4f4f4" },
  tCell: { width: 80 },
  tCellR: { width: 80, textAlign: "right" },
  edit: { borderBottomWidth: 1, borderColor: "#ccc" },
  totalRow: {
    borderTopWidth: 1,
    backgroundColor: "#fafafa",
    paddingTop: 10,
  },
});
