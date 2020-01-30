import React from 'react'
import { Modal, View, Button, Text, Image } from 'react-native'

export default function PayNowModal (props) {
  const { styles, qrCode, transactionDate, requestTransactionNumber, visible, onClose } = props
  return (
    <Modal
      useNativeDriver
      hideModalContentWhileAnimating
      animationIn='fadeIn'
      animationOut='fadeOut'
      visible={visible}
    >
      <View style={styles.container}>
        <Image
          style={{ width: 200, height: 200, alignSelf: 'center' }}
          source={{ uri: qrCode }}
        />
        <Text>Transaction Date: { transactionDate }</Text>
        <Text>Request Transaction Number: { requestTransactionNumber }</Text>
        <Button
          title='Done'
          onPress={onClose}/>
      </View>
    </Modal>
  )
}
