import axios from 'axios';

/**
 * Initializes an http client with our core tracing logic and headers
 * @returns
 */
const baseHttpClient = () => {
  const instance = axios.create({
    headers: { 'user-agent': `sleeper-2ez` },
    validateStatus: () => {
      return true;
    },
    // httpsAgent: new https.Agent({
    //   rejectUnauthorized: true,
    //   ca: caList,
    // }),
  });

  return instance;
};

const client = baseHttpClient();

/**
 * TODO Error handling should be it's own ticket to spend dedicated time refining
 * the structure here and in the consuming service layers
 * Error handling (ie: 400/500 level responses) were not handled at time of sendEmail work
 */

export const post = async (url: string, body: any) => {
  const result = await client.post(url, body);
  if (result.status >= 400) {
    throw new Error(result.data.message);
  }
  return result.data;
};

export const get = async (url: string) => {
  const result = await client.get(url);
  if (result.status >= 400) {
    throw new Error(result.data.message);
  }
  return result.data;
};