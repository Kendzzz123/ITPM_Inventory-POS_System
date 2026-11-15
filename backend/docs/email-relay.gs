/**
 * Mr. Liempo POS - email relay (Google Apps Script)
 *
 * Why: Render's free plan blocks the ports Gmail uses for sending mail, so the
 * online backend asks this script (running on the shop Gmail) to send the
 * password-reset codes over normal HTTPS instead.
 *
 * Setup (signed in as the shop Gmail, e.g. mrliempo.pos@gmail.com):
 *  1. script.google.com -> New project -> paste this whole file -> Save.
 *  2. Project Settings (gear) -> Script Properties -> Add property:
 *       SECRET = a long random text (the same value goes in Render's EMAIL_RELAY_SECRET)
 *  3. Deploy -> New deployment -> type "Web app"
 *       Execute as: Me      Who has access: Anyone
 *     Allow the permissions (Advanced -> Go to project if Google warns).
 *  4. Copy the Web app URL (ends with /exec) -> Render's EMAIL_RELAY_URL.
 * After editing this script: Deploy -> Manage deployments -> edit -> New version
 * (the URL stays the same).
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || data.secret !== secret) return reply({ ok: false, error: 'forbidden' });
    if (!data.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.to)) return reply({ ok: false, error: 'bad recipient' });

    MailApp.sendEmail({
      to: data.to,
      subject: String(data.subject || 'Mr. Liempo POS'),
      htmlBody: String(data.html || ''),
      name: String(data.name || 'Mr. Liempo POS'),
    });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** Opening the URL in a browser just shows that the relay is running. */
function doGet() {
  return reply({ ok: true, service: 'Mr. Liempo email relay' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
