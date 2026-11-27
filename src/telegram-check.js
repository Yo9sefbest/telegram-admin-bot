const DEFAULT_TIMEOUT_MS = 15_000;

async function checkTelegram(telegram, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  let timer;
  let timedOut = false;
  const timeoutError = new Error(`Timed out after ${timeoutMs / 1000} seconds while contacting Telegram.`);

  try {
    return await Promise.race([
      telegram.callApi('getMe', {}, { signal: controller.signal }),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } catch (err) {
    if (timedOut) throw timeoutError;
    if (err.code === 401) {
      throw new Error('Telegram rejected BOT_TOKEN (401 Unauthorized). Check that it is the current token from @BotFather.');
    }
    throw new Error(`Could not connect to Telegram: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { checkTelegram, DEFAULT_TIMEOUT_MS };
