const qs = require('querystring')

const BASE_URL = 'https://www.cpf.gov.sg/eSvc'

const COOKIE_REQUEST_VERIFICATION_TOKEN_NAME = '__RequestVerificationToken_L2VTdmMvV2Vi0'
const COOKIE_ASP_SESSIONID_NAME = 'ASP.NET_SessionId'

const COOKIE_PAYMENT_REQUEST_VERIFICATION_TOKEN_NAME = '__RequestVerificationToken_L2VTdmMvRVBheW1lbnRz0'

const constants = {
  COOKIE_REQUEST_VERIFICATION_TOKEN_NAME,
  COOKIE_ASP_SESSIONID_NAME,
  COOKIE_PAYMENT_REQUEST_VERIFICATION_TOKEN_NAME,
}

function SetCookieExtractor (setCookies) {
  return {
    get (name) {
      const cookieString = setCookies.find(v => v.startsWith(name))
      const [, value] = cookieString.replace(/;.*/, '').split('=')
      return value
    },
  }
}

const findRequestVerificationToken = /<input name="__RequestVerificationToken" type="hidden" value="([^"]+)"/

const findPaymentRequestToken = /<input type="hidden" id="request" name="request" value="([^"]+)"/
const findPaymentResponseToken = /<input type="hidden" id="response" name="response" value="([^"]+)"/

const findRequestTransactionNumber = /id="RequestTransactionNumber" name="RequestTransactionNumber" type="hidden" value="([^"]+)"/
const findPayNowUserId = /id="UserId" name="UserId" type="hidden" value="([^"]+)"/

const findQRCode = /<img id="qr-code-image" src="([^"]+)"/
const findTransactionDate = /Transaction Date".*>([^<]+)<\/span/

async function getDataForStartPage () {
  const response = await fetch(
    `${BASE_URL}/Web/Miscellaneous/Cashier/ECashierHomepage`,
    { credentials: 'include' },
  )
  const responseData = await response.text()
  const [, requestVerificationToken] = findRequestVerificationToken.exec(responseData)

  const cookies = SetCookieExtractor(response.headers.map['set-cookie'].split(', '))
  const cookieRVValue = cookies.get(COOKIE_REQUEST_VERIFICATION_TOKEN_NAME)
  const aspSessionId = cookies.get(COOKIE_ASP_SESSIONID_NAME)

  return {
    cookieRVValue,
    aspSessionId,
    requestVerificationToken,
  }
}

async function submitRSTURequest (params) {
  const {
    requestVerificationToken,
    recaptchaResponse,
    cpfAccountNumber,
    contactNumber,
    amount,
    cookies,
  } = params

  // TODO: take either CPF account number + recaptcha, or landing page payload
  // TODO: Take a hash of
  // https://www.cpf.gov.sg/Members/gen/TnC/RSTUCASH
  // and https://www.cpf.gov.sg/Members/others/member-pages/terms-of-use#PayNow
  // and compare it against what was given,
  // If the hash has changed, get the person to read it again

  const sessionConfig = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie:
        `${COOKIE_REQUEST_VERIFICATION_TOKEN_NAME}=${cookies[COOKIE_REQUEST_VERIFICATION_TOKEN_NAME]}; ` +
        `${COOKIE_ASP_SESSIONID_NAME}=${cookies[COOKIE_ASP_SESSIONID_NAME]}; `,
    },
  }

  const regexToMapper = regex => response => {
    console.log(regex, response.data)
    regex.exec(response.data)[1]
  }

  // TODO: actually check if we had a good response from CPF
  const postToCPFAndExtractResponseTokens = async (
    path,
    body,
    config = sessionConfig,
    tokenNameToMapper = { token: regexToMapper(findRequestVerificationToken) },
  ) => {
    const options = {
      method: 'POST',
      redirect: 'follow',
      ...config,
      body,
    }
    console.log(`Fetching from ${path} using ${JSON.stringify(options)}`)
    const fetchResponse = await fetch(
      `${BASE_URL}${path}`,
      options,
    )
    const data = await fetchResponse.text()
    console.log(path, fetchResponse.status, fetchResponse.url)
    if (!fetchResponse.ok) {
      console.log(config.headers.Cookie)
      console.log(fetchResponse.headers)
      console.log(data)
      throw new Error()
    }
    const response = {
      data,
      headers: {
        'set-cookie': fetchResponse.headers.map['set-cookie'].split(', '),
      },
    }
    const result = {}
    Object.entries(tokenNameToMapper).forEach(([name, mapper]) => {
      result[name] = mapper(response)
    })
    return result
  }

  const { token: inputPageVerificationToken } = await postToCPFAndExtractResponseTokens(
    '/Web/Miscellaneous/Cashier/ECashierHomepage',
    qs.stringify({
      AccountNumberType: cpfAccountNumber[0],
      AccountNumber: cpfAccountNumber.substring(1),
      'g-recaptcha-response': recaptchaResponse,
      __RequestVerificationToken: requestVerificationToken,
      PayingAs: 'Member',
      SelectedScheme: '~/Schemes/TopUpSpecialAccount/LandingPageCashier?cpfAccountNumber={0}',
    }),
  )

  const { token: confirmationVerificationToken } = await postToCPFAndExtractResponseTokens(
    '/Web/Schemes/TopUpSpecialAccount/InputPage',
    qs.stringify({
      __RequestVerificationToken: inputPageVerificationToken,
      'ServiceInformation.IsTermsAndConditionsChecked': true,
    }),
  )

  const { token: webPaymentRequestVerificationToken } = await postToCPFAndExtractResponseTokens(
    '/Web/Schemes/TopUpSpecialAccount/Confirmation',
    qs.stringify({
      __RequestVerificationToken: confirmationVerificationToken,
      RecipientAccountNumber: cpfAccountNumber,
      ContactNumber: contactNumber,
      RecipientRelation: 1, // self
      IsDeclaration: true,
      IsTaxable: false,
      TopUpAmount: amount,
      ServiceInformation: 'CPF.eServices.Web.Common.Models.ServiceInformationModel',
      'Requestor.CpfAccountNumber': cpfAccountNumber,
    }),
  )

  const { paymentRequestToken, webPaymentResponseUrl } = await postToCPFAndExtractResponseTokens(
    '/Web/Schemes/TopUpSpecialAccount/PaymentRequest',
    qs.stringify({ __RequestVerificationToken: webPaymentRequestVerificationToken }),
    sessionConfig,
    {
      paymentRequestToken: regexToMapper(findPaymentRequestToken),
      webPaymentResponseUrl: response => response.request.res.responseUrl,
    },
  )

  const paymentSessionConfig = {
    headers: {
      ...sessionConfig.headers,
      Referer: webPaymentResponseUrl,
    },
  }
  const {
    paymentRequestPostRequestVerificationToken,
    requestTransactionNumber,
    paymentRequestVerificationTokenCookie,
  } = await postToCPFAndExtractResponseTokens(
    '/EPayments/epayment/paymentrequest',
    qs.stringify({ request: paymentRequestToken }),
    paymentSessionConfig,
    {
      paymentRequestPostRequestVerificationToken: regexToMapper(findRequestVerificationToken),
      requestTransactionNumber: regexToMapper(findRequestTransactionNumber),
      paymentRequestVerificationTokenCookie: response => {
        return SetCookieExtractor(response.headers['set-cookie'])
          .get(COOKIE_PAYMENT_REQUEST_VERIFICATION_TOKEN_NAME)
      },
    },
  )

  const txnSessionConfig = {
    headers: {
      ...sessionConfig.headers,
      Cookie: sessionConfig.headers.Cookie +
        `${COOKIE_PAYMENT_REQUEST_VERIFICATION_TOKEN_NAME}=${paymentRequestVerificationTokenCookie}; `,
    },
  }

  const { paymentResponseToken } = await postToCPFAndExtractResponseTokens(
    '/EPayments/epayment/PaymentRequestPost',
    qs.stringify({
      __RequestVerificationToken: paymentRequestPostRequestVerificationToken,
      RequestTransactionNumber: requestTransactionNumber,
      Amount: amount,
      UseENetsSoapi: false,
      ServiceId: 'MTP',
      'ViewModel.SelectedPaymentType': 'PayNowQR',
      'ViewModel.TermsAccepted': true,
      btnSubmit: 'Make Payment',
    }),
    txnSessionConfig,
    { paymentResponseToken: regexToMapper(findPaymentResponseToken) },
  )

  const paymentResponseHeaders = {
    ...txnSessionConfig.headers,
    Referer: 'https://www.cpf.gov.sg/eSvc/EPayments/epayment/PaymentRequestPost',
  }
  const { paynowRequestVerificationToken, userId } = await postToCPFAndExtractResponseTokens(
    '/Web/payment/PaymentResponsePayNowQR',
    qs.stringify({ response: paymentResponseToken }),
    { headers: paymentResponseHeaders },
    {
      paynowRequestVerificationToken: regexToMapper(findRequestVerificationToken),
      userId: regexToMapper(findPayNowUserId),
    },
  )

  const { transactionDate, qrCode } = await postToCPFAndExtractResponseTokens(
    '/Web/Schemes/TopUpSpecialAccount/PayNowQRTransaction',
    qs.stringify({
      __RequestVerificationToken: paynowRequestVerificationToken,
      UserId: userId,
      RequestTransactionNumber: requestTransactionNumber,
      TransactionAmount: amount,
      CpfAccountNumber: cpfAccountNumber,
      ServiceId: 'MTP',
      TransactionStatus: 'Success',
      TransactionDateTime: '1/1/0001 12:00:00 AM',
    }),
    txnSessionConfig,
    {
      transactionDate: regexToMapper(findTransactionDate),
      qrCode: regexToMapper(findQRCode),
    },
  )

  return {
    qrCode,
    requestTransactionNumber,
    transactionDate,
  }
}

module.exports = {
  constants,
  getDataForStartPage,
  submitRSTURequest,
}
