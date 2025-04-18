import { Stack } from "expo-router";
import COLORS from "../../../constants/colors";

export default function IncomeStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { color: "white" },
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "white",
        headerStyle: { backgroundColor: COLORS.primary },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Income" }} />
      <Stack.Screen
        name="employment"
        options={{ title: "Employment Income" }}
      />
      <Stack.Screen name="business" options={{ title: "Business Income" }} />
    </Stack>
  );
}
