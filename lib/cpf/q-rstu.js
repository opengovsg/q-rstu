
const BASE_URL = 'http://localhost:29125'

const COOKIE_REQUEST_VERIFICATION_TOKEN_NAME = '__RequestVerificationToken_L2VTdmMvV2Vi0'
const COOKIE_ASP_SESSIONID_NAME = 'ASP.NET_SessionId'

export const constants = {
  COOKIE_REQUEST_VERIFICATION_TOKEN_NAME,
  COOKIE_ASP_SESSIONID_NAME,
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

  const initialData = await response.json()
  return initialData
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
