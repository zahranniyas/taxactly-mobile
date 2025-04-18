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
  Alert,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";

import {
  useQualifyingPayments,
  useEnsureQPDoc,
  useAddQPLine,
  useUpdateQPLine,
  useDeleteQPLine,
} from "../../../hooks/useQualifyingPayments";

const TYPES = ["Solar", "Charity", "Government"];
const CAPS = { Solar: 600000, Charity: 75000 };

export default function QualifyingPaymentsScreen() {
  const taxYear = "2025-26";

  const { data, isFetching, refetch } = useQualifyingPayments(taxYear);

  const ensureDoc = useEnsureQPDoc({
    onError: (e) => Alert.alert("Error", e.message),
  });
  const addLine = useAddQPLine({
    onError: (e) => Alert.alert("Error", e.message),
  });
  const updLine = useUpdateQPLine({
    onError: (e) => Alert.alert("Error", e.message),
  });
  const delLine = useDeleteQPLine({
    onError: (e) => Alert.alert("Error", e.message),
  });

  const blank = { date: new Date(), type: "Solar", amount: "", file: null };
  const [line, setLine] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  const [dpOpen, setDpOpen] = useState(false);
  const [dpValue, setDpValue] = useState("Solar");
  const [dpItems] = useState(TYPES.map((t) => ({ label: t, value: t })));

  useEffect(() => setLine((p) => ({ ...p, type: dpValue })), [dpValue]);

  const deductible = useMemo(() => {
    const amt = Number(line.amount || 0);
    if (line.type === "Government") return amt;
    return Math.min(amt, CAPS[line.type]);
  }, [line]);

  const pickFile = async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (doc.type === "success") setLine((p) => ({ ...p, file: doc }));
  };

  const reset = () => {
    setLine(blank);
    setDpValue("Solar");
    setEditingId(null);
  };

  const saving = addLine.isLoading || updLine.isLoading || ensureDoc.isLoading;

  const onSave = () => {
    const fd = new FormData();
    fd.append("date", line.date.toISOString());
    fd.append("type", line.type);
    fd.append("amount", Number(line.amount));
    if (line.file) {
      fd.append("file", {
        uri: line.file.fileCopyUri ?? line.file.uri,
        name: line.file.name,
        type: line.file.mimeType || "application/octet-stream",
      });
    }

    const exec = (docId) => {
      if (editingId) {
        updLine.mutate(
          { id: docId, lid: editingId, payload: fd, taxYear },
          { onSuccess: reset }
        );
      } else {
        addLine.mutate(
          { id: docId, payload: fd, taxYear },
          { onSuccess: reset }
        );
      }
    };

    data?._id
      ? exec(data._id)
      : ensureDoc.mutate({ taxYear }, { onSuccess: (doc) => exec(doc._id) });
  };

  const totals = useMemo(() => {
    const base = { Solar: 0, Charity: 0, Government: 0 };
    const ded = { Solar: 0, Charity: 0, Government: 0 };
    if (!data) return { base, ded };
    data.lines.forEach((l) => {
      base[l.type] += l.amount;
      ded[l.type] += l.deductible;
    });
    return { base, ded };
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
          listMode="SCROLLVIEW"
        />

        <TextInput
          placeholder="Amount (LKR)"
          keyboardType="numeric"
          value={line.amount}
          onChangeText={(v) => setLine((p) => ({ ...p, amount: v }))}
          style={styles.input}
        />

        <DateTimePicker
          value={line.date}
          mode="date"
          display="default"
          onChange={(_, d) => d && setLine((p) => ({ ...p, date: d }))}
          style={{ marginVertical: 6 }}
        />

        {line.amount !== "" && (
          <Text style={{ marginBottom: 6 }}>
            Deductible: {deductible.toLocaleString()}
          </Text>
        )}

        <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
          <Text style={{ fontWeight: "600" }}>
            {line.file ? "Change file" : "Attach image / PDF"}
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
              {t}: {totals.base[t].toLocaleString()} (Ded 
              {totals.ded[t].toLocaleString()})
            </Text>
          ))}
        </View>
      )}

      {data && (
        <FlatList
          style={{ flex: 1, marginTop: 8 }}
          data={[...data.lines].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          )}
          keyExtractor={(l) => l._id}
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
              <View style={{ alignItems: "flex-end", width: 120 }}>
                <Text>Amt {item.amount.toLocaleString()}</Text>
                <Text style={{ color: "#555" }}>
                  Ded {item.deductible.toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={{ marginHorizontal: 8 }}
                onPress={() => {
                  setEditingId(item._id);
                  setLine({
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
                  delLine.mutate({ id: data._id, lid: item._id, taxYear })
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
