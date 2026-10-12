import { StyleSheet, View, Text } from 'react-native'
import React from 'react'

const forgotpassword = () => {
  return (
    <View>
      <Text style={styles.title}>Forgot password</Text>
    </View>
  )
}
const styles = StyleSheet.create({
    title: {
        fontSize: 27,
    }

})

export default forgotpassword