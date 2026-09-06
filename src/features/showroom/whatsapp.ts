// The showroom detail page's "Message" button opens a WhatsApp chat to the
// single global number an admin configures at /admin/settings (system_settings
// key "whatsapp_contact_number") — never a per-showroom number, per direct
// user request. `wa.me` expects the number as plain digits with country
// code, no "+", no spaces — exactly how updateGeneralSettingsAction stores it.
export function buildWhatsAppLink(whatsappNumber: string, message: string): string | null {
  const digitsOnly = whatsappNumber.replace(/\D/g, "");
  if (!digitsOnly) return null;
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
