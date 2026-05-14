const CLIENT_ID = "CLIENT_ID_HERE";
const SECRET = "SECRET_HERE";

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = btoa(`${CLIENT_ID}:${SECRET}`);
  const response = await fetch(
    "https://oauth.oclc.org/token?grant_type=client_credentials&scope=wcapi",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    },
  );

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 60s buffer
  return cachedToken;
}

async function searchWorldCat(query) {
  const token = await getAccessToken();
  const response = await fetch(
    `https://americas.discovery.api.oclc.org/worldcat/search/v2/bibs?q=${encodeURIComponent(query)}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  console.log("Search response status:", response.status);
  const data = await response.json();
  console.log(data);
  return data;
}
