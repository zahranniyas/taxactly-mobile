import React from "react";
import { View, StyleSheet } from "react-native";

const HorizontalRule = () => <View style={styles.horizontalRule}></View>;

const styles = StyleSheet.create({
  horizontalRule: {
    borderBottomColor: "black",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
});

export default HorizontalRule;
