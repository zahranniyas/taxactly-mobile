import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useEffect } from "react";
import COLORS from "../../constants/colors";

const Profile = () => {
  const { user, token, checkAuth, logout } = useAuthStore();

  console.log(user, token);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/prof-image.jpg")}
        style={{ width: 180, height: 180 }}
        resizeMode="contain"
      />
      <Text style={styles.title}>{user?.username}</Text>
      <Text style={styles.title}>{user?.email}</Text>
      <TouchableOpacity
        onPress={logout}
        style={{
          backgroundColor: "red",
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 5,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: 600 }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  title: {
    color: COLORS.primary,
    fontSize: 24,
    marginTop: 5,
  },
});
