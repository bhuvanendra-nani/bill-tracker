export function buildTransactionShareText(item, currency = "INR") {
  return [
    `Bill Tracker`,
    `Title: ${item.title}`,
    `Amount: ${item.amount} ${currency}`,
    `Type: ${item.type}`,
    `Category: ${item.category || "-"}`,
    `Date: ${item.date || "-"}`,
    `Note: ${item.note || "-"}`
  ].join("\n");
}

export async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Bill Tracker",
        text,
      });
      return;
    } catch (error) {
      console.error("Native share cancelled/failed", error);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, "_blank");
}