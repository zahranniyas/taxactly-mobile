import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from "react-native";
import COLORS from "../../constants/colors";
import { useAlerts } from "../../hooks/useAlerts";

export default function AlertsScreen() {
  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    hasNextPage,
    error,
  } = useAlerts();

  const rows = data ? data.pages.flat() : [];

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Unable to load notices.</Text>
      </View>
    );
  }

  if (!rows.length && !isFetching) {
    return (
      <View style={styles.center}>
        <Text>No notices available.</Text>
      </View>
    );
  }

  return (
    <View>
      <View
        style={{
          paddingHorizontal: 5,
          paddingVertical: 10,
          backgroundColor: COLORS.primary,
        }}
      >
        <Text style={{ fontSize: 20, textAlign: "center", color: "white" }}>
          News & Alerts
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(_, idx) => idx.toString()}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => item.href && Linking.openURL(item.href)}
            disabled={!item.href}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.date}>{item.date}</Text>
            {item.href ? (
              <Text style={styles.link}>Tap to open</Text>
            ) : (
              <Text style={styles.link}>No attachment</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    padding: 14,
    borderBottomWidth: 0.7,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  title: { fontSize: 15, fontWeight: "600" },
  date: { marginTop: 2, color: "#555" },
  link: { marginTop: 4, color: "#0066cc", fontSize: 12 },
});
