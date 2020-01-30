import React from 'react'
import { Text, TextInput, StyleSheet, Button, View, NativeModules } from 'react-native'

import ReCaptcha from './components/ReCaptcha'
import PayNowModal from './components/PayNowModal'
import * as qRSTU from './lib/cpf/q-rstu'

const { Networking } = NativeModules

const url = 'https://www.cpf.gov.sg'
const siteKey = '6LcBRCQUAAAAADNtOvRKC54RP4PtaV8taOGNpjXe'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: '5%',
    paddingTop: '20%',
  },
  textInput: {
    borderBottomColor: '#000000',
    borderBottomWidth: 1,
  },
})

const PAYNOW_INITIAL_STATE = {
  qrCode: 'https://i.gifer.com/Cn0m.gif',
}

export default function App () {
  const [formData, setFormData] = React.useState({})

  const [isPayNowVisible, setPayNowVisible] = React.useState(false)
  const [payNow, setPayNow] = React.useState(PAYNOW_INITIAL_STATE)

  const onClosePayNowModal = () => {
    setPayNowVisible(false)
    setPayNow(PAYNOW_INITIAL_STATE)
  }

  const onMessage = event => {
    if (event && event.nativeEvent.data) {
      if (['error', 'expired'].includes(event.nativeEvent.data)) {
        setFormData({ ...formData, recaptchaResponse: undefined })
      } else {
        setFormData({ ...formData, recaptchaResponse: event.nativeEvent.data })
      }
    }
  }
  const onChangeText = name => text => {
    setFormData({ ...formData, [name]: text })
  }
  const submitRSTU = async () => {
    Networking.clearCookies(() => {})
    const {
      requestVerificationToken,
      cookieRVValue,
      aspSessionId,
    } = await qRSTU.getInitialData()
    Networking.clearCookies(() => {})
    const cookies = {
      [qRSTU.constants.COOKIE_ASP_SESSIONID_NAME]: aspSessionId,
      [qRSTU.constants.COOKIE_REQUEST_VERIFICATION_TOKEN_NAME]: cookieRVValue,
    }
    const params = {
      ...formData,
      requestVerificationToken,
    }
    setPayNowVisible(true)
    const result = await qRSTU.submit(params, cookies)
    setPayNow(result)
  }

  return (
    <View style={styles.container}>
      <TextInput
        onChangeText={onChangeText('cpfAccountNumber')}
        placeholder='CPF Account Number'
        style={styles.textInput}
      >
      </TextInput>
      <TextInput
        onChangeText={onChangeText('contactNumber')}
        placeholder='Contact Number'
        textContentType='telephoneNumber'
        keyboardType='phone-pad'
        style={styles.textInput}
      >
      </TextInput>
      <TextInput
        onChangeText={onChangeText('amount')}
        placeholder='Amount'
        keyboardType='decimal-pad'
        style={styles.textInput}
      >
      </TextInput>
      {/* <Text>
        By ticking the reCAPTCHA, I declare that:
        <Text>all the particulars given in this form are true and correct.</Text>
        <Text>
          I –
          <Text>have never been a bankrupt; or</Text>
          <Text>am a discharged bankrupt; or</Text>
          <Text>am an undischarged bankrupt and have obtained the Official Assignee’s approval to make a cash top-up.</Text>
        </Text>
        <Text>I have read, understood and accept the terms and conditions stated in the previous page.</Text>
      </Text> */}
      <ReCaptcha
        siteKey={siteKey}
        url={url}
        languageCode='en'
        onMessage={onMessage}
        style={{ marginBottom: '20%' }}
      />
      <Button
        style={{ paddingTop: '25%' }}
        title='Get PayNow QR for CPF RSTU'
        onPress={submitRSTU}
      />
      <PayNowModal
        styles={styles}
        visible={isPayNowVisible}
        onClose={onClosePayNowModal}
        {...payNow}
      />
    </View>
  )
}
