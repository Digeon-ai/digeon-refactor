// Wraps newsletter body HTML in a branded, email-safe template.
// Uses table layout + inline styles so it renders across all mail clients.

const LOGO_URL = 'https://bmalxlitzngsnhrocaem.supabase.co/storage/v1/object/public/blog-media/1782274874758-zeqhfdny0d.png'

export function wrapNewsletter(subject, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0e0f12;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0f12; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#14161b; border-radius:14px; overflow:hidden; border:1px solid #273141;">

          <!-- Header / logo -->
          <tr>
            <td align="center" style="background-color:#14161b; padding:28px 24px 16px;">
              <img src="${LOGO_URL}" alt="Digeon.ai" width="160" style="display:block; height:auto; border:0;">
            </td>
          </tr>

          <!-- Teal divider -->
          <tr><td style="height:3px; background-color:#19b6ad; line-height:3px; font-size:0;">&nbsp;</td></tr>

          <!-- Body content -->
          <tr>
            <td style="padding:28px 32px; color:#eaeaea; font-family:Arial, sans-serif; font-size:16px; line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#101319; padding:20px 32px; text-align:center; color:#9fb0c2; font-family:Arial, sans-serif; font-size:13px; border-top:1px solid #273141;">
              <p style="margin:0 0 6px;">You're receiving this because you subscribed to the Digeon newsletter.</p>
              <p style="margin:0; color:#19b6ad;">&copy; 2025 Digeon AI</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}