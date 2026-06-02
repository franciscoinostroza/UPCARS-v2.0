import { google } from 'googleapis'

let accessToken: string | null = null

async function getAccessToken(): Promise<string> {
  if (accessToken) return accessToken

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost'
  )

  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  const { token } = await client.getAccessToken()
  accessToken = token || null
  return accessToken || ''
}

export async function getReviews() {
  const token = await getAccessToken()
  const accountId = process.env.GOOGLE_ACCOUNT_ID

  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/-/reviews`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!res.ok) {
      console.error('Google My Business API error:', res.status, await res.text())
      return []
    }

    const data: any = await res.json()
    return data.reviews || []
  } catch (error) {
    console.error('Error fetching Google reviews:', error)
    return []
  }
}
