import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";

import {
  useTaxPayments,
  useEnsureTaxDoc,
  useAddTaxPayment,
  useUpdateTaxPayment,
  useDeleteTaxPayment,
} from "../../../hooks/useTaxPayments";

const TYPES = ["Q1", "Q2", "Q3", "Q4", "Final"];

export default function TaxPaymentsScreen() {
  const taxYear = "2025-26";

  const { data, isFetching, refetch } = useTaxPayments(taxYear);

  const ensure = useEnsureTaxDoc({ onError: (e) => alert(e.message) });
  const add = useAddTaxPayment({ onError: (e) => alert(e.message) });
  const upd = useUpdateTaxPayment({ onError: (e) => alert(e.message) });
  const del = useDeleteTaxPayment({ onError: (e) => alert(e.message) });

  const blank = { date: new Date(), type: "Q1", amount: "", file: null };
  const [payment, setPayment] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  const [dpOpen, setDpOpen] = useState(false);
  const [dpValue, setDpValue] = useState("Q1");
  const [dpItems] = useState(TYPES.map((t) => ({ label: t, value: t })));

  useEffect(() => setPayment((p) => ({ ...p, type: dpValue })), [dpValue]);

  const pickFile = async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (doc.type === "success") setPayment((p) => ({ ...p, file: doc }));
  };

  const reset = () => {
    setPayment(blank);
    setDpValue("Q1");
    setEditingId(null);
  };

  const saving = add.isLoading || upd.isLoading || ensure.isLoading;

  const onSave = () => {
    const fd = new FormData();
    fd.append("date", payment.date.toISOString());
    fd.append("type", payment.type);
    fd.append("amount", Number(payment.amount));
    if (payment.file) {
      fd.append("file", {
        uri: payment.file.fileCopyUri ?? payment.file.uri,
        name: payment.file.name,
        type: payment.file.mimeType || "application/octet-stream",
      });
    }

    const exec = (docId) => {
      if (editingId) {
        upd.mutate(
          { id: docId, pid: editingId, payload: fd, taxYear },
          { onSuccess: reset }
        );
      } else {
        add.mutate({ id: docId, payload: fd, taxYear }, { onSuccess: reset });
      }
    };

    data?._id
      ? exec(data._id)
      : ensure.mutate({ taxYear }, { onSuccess: (doc) => exec(doc._id) });
  };

  const totals = useMemo(() => {
    const base = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Final: 0 };
    if (!data) return base;
    data.payments.forEach((p) => {
      base[p.type] += p.amount;
    });
    return base;
  }, [data]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.card}>
        <DropDownPicker
          open={dpOpen}
          value={dpValue}
          items={dpItems}
          setOpen={setDpOpen}
          setValue={setDpValue}
          style={styles.dp}
          dropDownContainerStyle={{ borderColor: "#ccc" }}
        />

        <TextInput
          placeholder="Amount (LKR)"
          keyboardType="numeric"
          value={payment.amount}
          onChangeText={(v) => setPayment((p) => ({ ...p, amount: v }))}
          style={styles.input}
        />

        <DateTimePicker
          value={payment.date}
          mode="date"
          display="default"
          onChange={(_, d) => d && setPayment((p) => ({ ...p, date: d }))}
          style={{ marginVertical: 6 }}
        />

        <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
          <Text style={{ fontWeight: "600" }}>
            {payment.file ? "Change file" : "Attach image / PDF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={onSave}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveTxt}>{editingId ? "Update" : "Save"}</Text>
          )}
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity onPress={reset} style={{ marginTop: 4 }}>
            <Text style={{ color: "#0066cc" }}>Cancel edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {data && (
        <View style={styles.totalCard}>
          {TYPES.map((t) => (
            <Text key={t} style={{ fontWeight: 600 }}>
              {t}: {totals[t].toLocaleString()}
            </Text>
          ))}
        </View>
      )}

      {data && (
        <FlatList
          style={{ flex: 1, marginTop: 8 }}
          data={[...data.payments].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          )}
          keyExtractor={(p) => p._id}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 600 }}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                <Text>{item.type}</Text>
              </View>
              <Text style={{ width: 100, textAlign: "right" }}>
                {item.amount.toLocaleString()}
              </Text>

              <TouchableOpacity
                style={{ marginHorizontal: 8 }}
                onPress={() => {
                  setEditingId(item._id);
                  setPayment({
                    date: new Date(item.date),
                    type: item.type,
                    amount: item.amount.toString(),
                    file: null,
                  });
                  setDpValue(item.type);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#555" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  del.mutate({ id: data._id, pid: item._id, taxYear })
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
  card: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  dp: { borderColor: "#ccc", height: 40 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
  },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
});
