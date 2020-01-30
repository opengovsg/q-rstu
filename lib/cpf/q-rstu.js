
const BASE_URL = 'http://localhost:29125'

const COOKIE_REQUEST_VERIFICATION_TOKEN_NAME = '__RequestVerificationToken_L2VTdmMvV2Vi0'
const COOKIE_ASP_SESSIONID_NAME = 'ASP.NET_SessionId'

export const constants = {
  COOKIE_REQUEST_VERIFICATION_TOKEN_NAME,
  COOKIE_ASP_SESSIONID_NAME,
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

export async function getInitialData () {
  const response = await fetch(
    BASE_URL,
    {
      credentials: 'include',
      headers: {
        accept: 'application/json',
      },
    },
  )
  const cookies = SetCookieExtractor(response.headers.map['set-cookie'].split(', '))
  const cookieRVValue = cookies.get(COOKIE_REQUEST_VERIFICATION_TOKEN_NAME)
  const aspSessionId = cookies.get(COOKIE_ASP_SESSIONID_NAME)

  const { requestVerificationToken, recaptchaSiteKey } = await response.json()
  return {
    cookieRVValue,
    aspSessionId,
    requestVerificationToken,
    recaptchaSiteKey,
  }
}

export async function submit (body, cookies) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      Cookie:
        `${COOKIE_REQUEST_VERIFICATION_TOKEN_NAME}=${cookies[COOKIE_REQUEST_VERIFICATION_TOKEN_NAME]}; ` +
        `${COOKIE_ASP_SESSIONID_NAME}=${cookies[COOKIE_ASP_SESSIONID_NAME]}; `,
    },
  }
  const response = await fetch(
    `${BASE_URL}/cpf/sa/rstu`,
    {
      method: 'POST',
      ...config,
      body: JSON.stringify(body),
    },
  )
  const result = await response.json()
  return result
}
