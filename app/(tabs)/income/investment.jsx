import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import DropDownPicker from "react-native-dropdown-picker";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  useInvestmentIncome,
  useEnsureInvestmentDoc,
  useAddInvLine,
  useUpdateInvLine,
  useDeleteInvLine,
} from "../../../hooks/useInvestmentIncome";

const TYPES = ["Rent", "Interest", "Dividend", "Other"];
const RATES = { Rent: 0.1, Interest: 0.05, Dividend: 0.15 };

export default function InvestmentIncomeScreen() {
  const taxYear = "2025-26";

  /* queries */
  const { data, refetch, isFetching } = useInvestmentIncome(taxYear);

  /* mutations */
  const ensureDoc = useEnsureInvestmentDoc({
    onError: (e) => Alert.alert("Error", e.message),
  });
  const addLine = useAddInvLine({
    onError: (e) => Alert.alert("Error", e.message),
  });
  const updLine = useUpdateInvLine({
    onError: (e) => Alert.alert("Error", e.message),
  });
  const delLine = useDeleteInvLine({
    onError: (e) => Alert.alert("Error", e.message),
  });

  /* form state */
  const blank = {
    date: new Date(),
    type: "Rent",
    category: "",
    amount: "",
    file: null,
  };
  const [line, setLine] = useState(blank);
  const [editingLid, setEditingLid] = useState(null);
  const [formOpen, setFormOpen] = useState(true);
  const isSaving =
    addLine.isLoading || updLine.isLoading || ensureDoc.isLoading;

  /* pick file */
  const pickFile = async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (doc.type === "success") setLine((p) => ({ ...p, file: doc }));
  };

  const resetForm = () => {
    setLine(blank);
    setEditingLid(null);
  };

  /* save / update */
  const onSave = () => {
    const payload = new FormData();
    payload.append("date", line.date.toISOString());
    payload.append("type", line.type);
    if (line.type === "Other") payload.append("category", line.category);
    payload.append("amount", Number(line.amount));
    if (line.file) {
      payload.append("file", {
        uri: line.file.fileCopyUri ?? line.file.uri,
        name: line.file.name,
        type: line.file.mimeType || "application/octet-stream",
      });
    }

    const doSave = (docId) => {
      if (editingLid) {
        updLine.mutate(
          { id: docId, lid: editingLid, payload, taxYear },
          { onSuccess: resetForm }
        );
      } else {
        addLine.mutate(
          { id: docId, payload, taxYear },
          { onSuccess: resetForm }
        );
      }
    };

    if (data?._id) doSave(data._id);
    else ensureDoc.mutate({ taxYear }, { onSuccess: (doc) => doSave(doc._id) });
  };

  /* totals */
  const { totalAmt, totalWht } = useMemo(() => {
    if (!data) return { totalAmt: 0, totalWht: 0 };
    return data.lines.reduce(
      (acc, l) => ({
        totalAmt: acc.totalAmt + l.amount,
        totalWht: acc.totalWht + l.wht,
      }),
      { totalAmt: 0, totalWht: 0 }
    );
  }, [data]);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(line.type);

  /* UI */
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* form header */}
      <Pressable
        style={styles.cardHeader}
        onPress={() => setFormOpen((o) => !o)}
      >
        <Text style={styles.h2}>
          {editingLid ? "Edit" : "Add"} Investment Income
        </Text>
        <Text style={styles.chevron}>{formOpen ? "▲" : "▼"}</Text>
      </Pressable>

      {formOpen && (
        <View style={styles.cardBody}>
          {/* type */}
          <DropDownPicker
            open={open}
            value={value}
            setOpen={setOpen}
            setValue={(cb) => {
              const v = cb(value);
              setValue(v);
              setLine((p) => ({ ...p, type: v }));
            }}
            items={TYPES.map((t) => ({ label: t, value: t }))}
            style={{ borderColor: "#ccc" }}
          />

          {line.type === "Other" && (
            <TextInput
              placeholder="Specify category"
              value={line.category}
              onChangeText={(v) => setLine((p) => ({ ...p, category: v }))}
              style={styles.input}
            />
          )}

          {/* date */}
          <DateTimePicker
            value={line.date}
            mode="date"
            display="default"
            onChange={(_, d) => d && setLine((p) => ({ ...p, date: d }))}
            style={{ marginVertical: 6 }}
          />

          {/* amount */}
          <TextInput
            placeholder="Amount (LKR)"
            keyboardType="numeric"
            value={line.amount}
            onChangeText={(v) => setLine((p) => ({ ...p, amount: v }))}
            style={styles.input}
          />

          {/* current WHT */}
          {line.amount !== "" && (
            <Text style={{ marginBottom: 6 }}>
              WHT ({(RATES[line.type] ?? 0) * 100}%) ={" "}
              {Math.round(
                Number(line.amount || 0) * (RATES[line.type] ?? 0)
              ).toLocaleString()}
            </Text>
          )}

          {/* file */}
          <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
            <Text style={{ fontWeight: "600" }}>
              {line.file ? "Change file" : "Attach image / PDF"}
            </Text>
          </TouchableOpacity>

          {/* save / update */}
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
                {editingLid ? "Update" : "Save"}
              </Text>
            )}
          </TouchableOpacity>

          {editingLid && (
            <TouchableOpacity onPress={resetForm} style={{ marginTop: 4 }}>
              <Text style={{ color: "#0066cc" }}>Cancel edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* totals */}
      {data && (
        <View style={styles.totalCard}>
          <Text style={{ fontWeight: 600 }}>
            Gross: {totalAmt.toLocaleString()}
          </Text>
          <Text style={{ fontWeight: 600 }}>
            WHT: {totalWht.toLocaleString()}
          </Text>
          <Text style={{ fontWeight: "700" }}>
            Net: {(totalAmt - totalWht).toLocaleString()}
          </Text>
        </View>
      )}

      {/* list */}
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
            <View style={styles.tRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 600 }}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                <Text>
                  {item.type}
                  {item.type === "Other" ? ` – ${item.category}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", width: 120 }}>
                <Text>Amt {item.amount.toLocaleString()}</Text>
                <Text style={{ color: "#555" }}>
                  WHT {item.wht.toLocaleString()}
                </Text>
              </View>

              {/* edit */}
              <TouchableOpacity
                style={{ marginHorizontal: 8 }}
                onPress={() => {
                  setFormOpen(true);
                  setEditingLid(item._id);
                  setLine({
                    date: new Date(item.date),
                    type: TYPES.includes(item.type) ? item.type : "Other",
                    category: item.category ?? "",
                    amount: item.amount.toString(),
                    file: null,
                  });
                }}
              >
                <Ionicons name="create-outline" size={20} color="#555" />
              </TouchableOpacity>

              {/* delete */}
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

/* styles */
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
    gap: 10,
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
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
});

/* put below your StyleSheet.create */
const pickerSelectStyles = {
  inputIOS: {
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    justifyContent: "center",
  },
  inputAndroid: {
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    color: "#000",
  },
  iconContainer: {
    position: "absolute",
    right: 8,
    top: 8,
  },
};
