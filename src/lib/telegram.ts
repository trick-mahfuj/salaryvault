export async function sendTelegramAlert(
  message: string,
  botToken?: string,
  chatId?: string
): Promise<boolean> {
  if (!botToken || !chatId || !botToken.trim() || !chatId.trim()) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function formatSecurityAlert(
  event: string,
  details: {
    ip?: string;
    device?: string;
    browser?: string;
    route?: string;
    email?: string;
    newPassword?: string;
  }
): string {
  const time = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    dateStyle: "full",
    timeStyle: "medium",
  });

  if (event === "Password Rotated" && details.newPassword) {
    return [
      `<b>🔐 Admin Password Rotated</b>`,
      ``,
      `<b>New Password:</b>`,
      `<code>${details.newPassword}</code>`,
      ``,
      `<b>Time:</b> ${time}`,
      details.device ? `<b>Device:</b> ${details.device}` : "",
      details.ip ? `<b>IP:</b> ${details.ip}` : "",
      `<b>Security Status:</b> Rotation Successful ✅`,
      ``,
      `<b>⚠️ IMPORTANT:</b> This password is valid until the next rotation.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `<b>🚨 MNIT Security Alert</b>`,
    ``,
    `<b>Event:</b> ${event}`,
    `<b>Time:</b> ${time}`,
    details.ip ? `<b>IP:</b> ${details.ip}` : "",
    details.device ? `<b>Device:</b> ${details.device}` : "",
    details.browser ? `<b>Browser:</b> ${details.browser}` : "",
    details.route ? `<b>Route:</b> ${details.route}` : "",
    details.email ? `<b>Email:</b> ${details.email}` : "",
    ``,
    `<b>Status:</b> ⚠️ Requires Attention`,
  ]
    .filter(Boolean)
    .join("\n");
}
