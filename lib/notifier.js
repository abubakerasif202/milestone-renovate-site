const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LABELS = { kitchen: 'Kitchen', bathroom: 'Bathroom', whole_home: 'Whole home', extension: 'Extension / addition', other: 'Other' };

/** Staff notification via Resend. `enabled` is false unless fully configured. */
export function createResendNotifier({ apiKey, to, from, fetchImpl = fetch }) {
  const enabled = Boolean(apiKey && to && from);
  return {
    enabled,
    async sendStaffNotification({ reference, enquiry }) {
      const rows = [
        ['Reference', reference],
        ['Name', enquiry.name],
        ['Phone', enquiry.phone],
        ['Email', enquiry.email],
        ['Location', [enquiry.suburb, enquiry.postcode].filter(Boolean).join(' ')],
        ['Renovation', LABELS[enquiry.category] ?? enquiry.category],
        ['Budget', enquiry.budgetRange ?? 'Not specified'],
        ['Timeline', enquiry.timeline ?? 'Not specified'],
        ['Source', enquiry.source],
        ['Details', enquiry.details ?? '(see questionnaire answers in the database)'],
      ];
      const html = `<table cellpadding="6">${rows.map(([k, v]) => `<tr><th align="left">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table>`;
      const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
      const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: to.split(',').map((s) => s.trim()).filter(Boolean),
          reply_to: enquiry.email,
          subject: `New renovation enquiry ${reference} — ${LABELS[enquiry.category] ?? enquiry.category}`,
          html,
          text,
        }),
      });
      if (!response.ok) throw Object.assign(new Error('resend rejected'), { code: `resend_${response.status}` });
    },
  };
}
