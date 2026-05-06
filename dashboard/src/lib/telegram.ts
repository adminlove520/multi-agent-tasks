export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  if (!botToken || !chatId) return;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML", // Switch to HTML for better reliability with special characters
        disable_web_page_preview: true,
      }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      console.error("[TG API Error]", data);
      
      // Fallback: If HTML fails (e.g. bad tags), try plain text
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/<[^>]*>?/gm, ""), // Strip tags
          disable_web_page_preview: true,
        }),
      });
    }
  } catch (e) {
    console.error("[TG Notification Error]", e);
  }
}

