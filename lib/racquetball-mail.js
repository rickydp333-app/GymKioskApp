'use strict';

function createLeagueMailer({ league, transporter, from, logger = console }) {
  let running = false, timer = null;
  async function flush() {
    if (running) return;
    running = true;
    try {
      const messages = league.pendingMail();
      if (messages.length && (!transporter || !from)) {
        logger.error('Racquetball confirmation emails are queued but SMTP/sender is not configured.');
        return;
      }
      for (const message of messages) {
        try {
          await transporter.sendMail({ from, to: message.recipient, subject: message.subject, text: message.text, html: message.html });
          league.mailSent(message.id);
        } catch (error) {
          league.mailFailed(message.id, error.message);
          logger.error('Racquetball confirmation email failed; queued for retry:', error.message);
        }
      }
    } finally { running = false; }
  }
  const safeFlush = () => flush().catch(error => logger.error('Racquetball email queue failure:', error.message));
  return {
    flush: safeFlush,
    start() { if (!timer) { timer = setInterval(safeFlush, 60000); timer.unref(); void safeFlush(); } },
    stop() { clearInterval(timer); timer = null; }
  };
}
module.exports = { createLeagueMailer };
