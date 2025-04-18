import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  useBusinessIncome,
  useEnsureBusinessDoc,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "../../../hooks/useBusinessIncome";
import HorizontalRule from "../../../components/HorizontalRule";

const CATEGORIES = [
  "Sales",
  "Services",
  "Supplies",
  "Rent",
  "Utilities",
  "Travel",
  "Wages",
  "Other",
];

export default function BusinessIncomeScreen() {
  const taxYear = "2025-26";

  const { data, refetch, isFetching } = useBusinessIncome(taxYear);

  const ensureDoc = useEnsureBusinessDoc({
    onError: (e) => Alert.alert("Save failed", e.message),
  });
  const addTx = useAddTransaction({
    onError: (e) => Alert.alert("Save failed", e.message),
  });
  const updTx = useUpdateTransaction({
    onError: (e) => Alert.alert("Update failed", e.message),
  });
  const delTx = useDeleteTransaction({
    onError: (e) => Alert.alert("Delete failed", e.message),
  });

  const [formOpen, setFormOpen] = useState(true);
  const [editingTid, setEditingTid] = useState(null);

  const blankTx = {
    date: new Date(),
    type: "income",
    category: CATEGORIES[0],
    customCategory: "",
    description: "",
    amount: "",
    file: null,
  };
  const [tx, setTx] = useState(blankTx);

  const isSaving = addTx.isLoading || ensureDoc.isLoading || updTx.isLoading;

  const pickFile = async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (doc.type === "success") setTx((p) => ({ ...p, file: doc }));
  };

  const resetTx = () => {
    setTx(blankTx);
    setEditingTid(null);
  };

  const onSave = () => {
    const payload = new FormData();
    payload.append("date", tx.date.toISOString());
    payload.append("type", tx.type);
    payload.append(
      "category",
      tx.category === "Other" ? tx.customCategory || "Other" : tx.category
    );
    payload.append("description", tx.description);
    payload.append("amount", Number(tx.amount));
    if (tx.file) {
      payload.append("file", {
        uri: tx.file.fileCopyUri ?? tx.file.uri,
        name: tx.file.name,
        type: tx.file.mimeType || "application/octet-stream",
      });
    }

    const save = (docId) => {
      if (editingTid) {
        updTx.mutate(
          { id: docId, tid: editingTid, payload, taxYear },
          { onSuccess: resetTx }
        );
      } else {
        addTx.mutate({ id: docId, payload, taxYear }, { onSuccess: resetTx });
      }
    };

    if (data?._id) {
      save(data._id);
    } else {
      ensureDoc.mutate({ taxYear }, { onSuccess: (doc) => save(doc._id) });
    }
  };

  const { totalIncome, totalExpense } = useMemo(() => {
    if (!data) return { totalIncome: 0, totalExpense: 0 };
    return data.transactions.reduce(
      (acc, t) =>
        t.type === "income"
          ? { ...acc, totalIncome: acc.totalIncome + t.amount }
          : { ...acc, totalExpense: acc.totalExpense + t.amount },
      { totalIncome: 0, totalExpense: 0 }
    );
  }, [data]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable
        style={styles.cardHeader}
        onPress={() => setFormOpen((o) => !o)}
      >
        <Text style={styles.h2}>
          {editingTid
            ? "Edit Transaction"
            : `Add ${tx.type === "income" ? "Income" : "Expense"}`}
        </Text>
        <Text style={styles.chevron}>{formOpen ? "▲" : "▼"}</Text>
      </Pressable>

      {formOpen && (
        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            {["income", "expense"].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setTx((p) => ({ ...p, type: v }))}
                style={[
                  styles.typeBtn,
                  tx.type === v && { backgroundColor: "#0066cc" },
                ]}
              >
                <Text style={{ color: tx.type === v ? "#fff" : "#000" }}>
                  {v.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <DateTimePicker
            value={tx.date}
            mode="date"
            display="default"
            onChange={(_, d) => d && setTx((p) => ({ ...p, date: d }))}
            style={{ marginVertical: 8 }}
          />

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={tx.category}
              onValueChange={(v) => setTx((p) => ({ ...p, category: v }))}
              mode={Platform.OS === "android" ? "dropdown" : "dialog"}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {CATEGORIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>

          {tx.category === "Other" && (
            <TextInput
              placeholder="Specify category"
              value={tx.customCategory}
              onChangeText={(v) => setTx((p) => ({ ...p, customCategory: v }))}
              style={styles.input}
            />
          )}

          <TextInput
            placeholder="Description"
            value={tx.description}
            onChangeText={(v) => setTx((p) => ({ ...p, description: v }))}
            style={styles.input}
          />

          <TextInput
            placeholder="Amount (LKR)"
            keyboardType="numeric"
            value={tx.amount}
            onChangeText={(v) => setTx((p) => ({ ...p, amount: v }))}
            style={styles.input}
          />

          <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
            <Text style={{ fontWeight: "600" }}>
              {tx.file ? "Change file" : "Attach image / PDF"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
            disabled={isSaving}
            onPress={onSave}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveTxt}>
                {editingTid ? "Update" : "Save"}
              </Text>
            )}
          </TouchableOpacity>

          {editingTid && (
            <TouchableOpacity
              onPress={resetTx}
              style={{ marginTop: 4, alignSelf: "flex-start" }}
            >
              <Text style={{ color: "#0066cc" }}>Cancel edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {data && (
        <View style={styles.totalCard}>
          <View style={styles.totalCardView}>
            <Text style={{ fontWeight: "600", color: "green" }}>Income</Text>
            <Text style={{ fontWeight: "600", color: "green" }}>
              + {totalIncome.toLocaleString()}
            </Text>
          </View>
          <View style={styles.totalCardView}>
            <Text style={{ fontWeight: "600", color: "red" }}>Expense</Text>
            <Text style={{ fontWeight: "600", color: "red" }}>
              - {totalExpense.toLocaleString()}
            </Text>
          </View>
          <HorizontalRule />
          <View style={styles.totalCardView}>
            <Text style={{ fontWeight: "700" }}>Profit/Loss</Text>
            <Text style={{ fontWeight: "700" }}>
              {(totalIncome - totalExpense).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {data && (
        <FlatList
          style={{ flex: 1, marginTop: 8 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          data={[...data.transactions].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          )}
          keyExtractor={(t) => t._id}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <View style={styles.tRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                <Text>{item.category}</Text>
                {item.description ? (
                  <Text style={{ color: "#555" }}>{item.description}</Text>
                ) : null}
              </View>

              <Text
                style={{
                  width: 90,
                  textAlign: "right",
                  color: item.type === "income" ? "green" : "red",
                }}
              >
                {item.type === "income" ? "+" : "-"}
                {item.amount.toLocaleString()}
              </Text>

              <TouchableOpacity
                style={{ marginLeft: 12 }}
                onPress={() => {
                  setFormOpen(true);
                  setEditingTid(item._id);
                  setTx({
                    date: new Date(item.date),
                    type: item.type,
                    category: CATEGORIES.includes(item.category)
                      ? item.category
                      : "Other",
                    customCategory: CATEGORIES.includes(item.category)
                      ? ""
                      : item.category,
                    description: item.description,
                    amount: item.amount.toString(),
                    file: null,
                  });
                }}
              >
                <Ionicons name="create-outline" size={20} color="#555" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginLeft: 12 }}
                onPress={() =>
                  delTx.mutate({ id: data._id, tid: item._id, taxYear })
                }
              >
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
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
  h2: { fontSize: 20, fontWeight: "600" },
  chevron: { fontSize: 16, fontWeight: "600" },
  rowBetween: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#0066cc",
    borderRadius: 4,
    alignItems: "center",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    overflow: "hidden",
    height: 40,
  },
  picker: { height: 40, width: "100%" },
  pickerItem: { height: 40, fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 6 },
  fileBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#0066cc",
    borderRadius: 6,
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: "#0066cc",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveTxt: { color: "#fff", fontWeight: "600" },
  totalCard: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    gap: 4,
  },
  totalCardView: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
});
