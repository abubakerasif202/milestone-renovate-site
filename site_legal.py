"""Customer-facing legal pages: Privacy Policy, Website Terms of Use and Cost Estimate Disclaimer.

Content describes only functionality that exists on this site (enquiry forms stored in Supabase, staff
notification email through Resend, hosting on Vercel, no analytics or advertising cookies). Facts that are not
established (trading entity, ABN, postal address, retention periods) are deliberately not stated.
"""
from __future__ import annotations

from site_constants import ACN, COMPANY, LICENCE, LICENCE_URL

LEGAL_UPDATED = '12 October 2026'
OAIC_PHONE = '1300 363 992'


def _hero(eyebrow: str, title_html: str, intro: str) -> str:
    return f'<section class="inner-hero compact"><div class="wrap"><p class="eyebrow inverse">{eyebrow}</p><h1>{title_html}</h1><p>{intro}</p></div></section>'


def _doc(body: str) -> str:
    return f'<section class="section"><div class="wrap legal">{body}</div></section>'


def _contact(email: str, phone: str, phone_href: str) -> str:
    return f'<a href="mailto:{email}">{email}</a> or <a href="{phone_href}">{phone}</a>'


def privacy_page(email: str, phone: str, phone_href: str, parent_url: str) -> str:
    contact = _contact(email, phone, phone_href)
    body = f'''<p class="fine-print">Effective {LEGAL_UPDATED}.</p>
<p>This Privacy Policy explains how personal information is handled when you use milestonerenovate.com. Milestone Renovate is a renovation brand operated under <a href="{parent_url}" target="_blank" rel="noopener">Milestone Development</a>. In this policy, “we” and “us” means Milestone Development operating as Milestone Renovate. Renovation building work is contracted by {COMPANY} (ACN {ACN}), NSW Contractor Licence <a href="{LICENCE_URL}" target="_blank" rel="noopener">{LICENCE}</a>. We follow the principles in the Privacy Act 1988 (Cth), including the Australian Privacy Principles, in how we collect, use, store and disclose personal information.</p>
<h2>1. What we collect</h2>
<p>You can browse this website without giving us any personal information. We collect personal information only when you choose to send us an enquiry through the contact form, the renovation questionnaire, the 15-minute call booking form or the quote audit form. That information is:</p>
<ul><li>your name, phone number and email address;</li><li>your suburb and/or postcode;</li><li>the type of renovation, and optionally your budget range and preferred timing;</li><li>anything you write about your project, and the planning or cost-calculator selections you choose to carry into your enquiry;</li><li>a record of your consent (the time you agreed, the version of the consent wording and the page you submitted from).</li></ul>
<p>Please do not include sensitive information such as government identifiers, payment card details or health information in the free-text fields. We do not ask for it.</p>
<p>To limit abuse we also keep a one-way hashed form of your IP address. We do not store your raw IP address with your enquiry. Our hosting provider processes technical request information, such as IP address and browser type, to deliver the website and keep it secure.</p>
<h2>2. Why we collect it and how we use it</h2>
<p>We use your information to respond to your enquiry, discuss your renovation, arrange a call or site assessment you have asked for, and keep a record of that conversation. We also use limited technical information to prevent spam and abuse and to keep the website secure. We do not sell your personal information.</p>
<h2>3. Marketing</h2>
<p>We do not currently send marketing emails or text messages, and we do not use enquiry details for marketing. If we ever offer marketing communications, we will ask for your separate consent first, identify ourselves in each message and include a working unsubscribe option, as the Spam Act 2003 (Cth) requires. Agreeing to be contacted about your enquiry is not consent to marketing.</p>
<h2>4. Who we share it with</h2>
<p>We use the following service providers to operate the website and handle enquiries. They process information for us and are not permitted to use it for their own marketing:</p>
<ul><li><strong>Supabase</strong> hosts the secured database where enquiries are stored. Our database is hosted in Sydney, Australia. Access is limited to authorised Milestone staff and our service providers.</li><li><strong>Resend</strong> delivers the notification email that tells the Milestone team a new enquiry has arrived. The notification contains the details you submitted.</li><li><strong>Vercel</strong> hosts the website and runs the code that receives enquiries. Our enquiry-handling code runs in Sydney.</li><li><strong>Microsoft 365</strong> provides the business mailbox that receives the notification email.</li></ul>
<p>We may also disclose personal information if the law requires or authorises it. We do not otherwise disclose your information to third parties.</p>
<h2>5. Storage outside Australia</h2>
<p>Your enquiry is stored in our Sydney database. However, some of the information is also processed overseas by the providers that help us run the website:</p><ul><li>When an enquiry arrives, Resend generates the notification email to our team from its Japan (Tokyo) region. That email contains the details you submitted.</li><li>Our hosting provider delivers the website through a global network, so website content and technical request information (such as IP address and browser type) may be handled in other countries.</li><li>Our Microsoft 365 mailbox is provided by Microsoft, which may store and process email in its data centres in other countries.</li></ul><p>We take reasonable steps to ensure providers handle information consistently with the Australian Privacy Principles.</p>
<h2>6. Security</h2>
<p>The website is served over HTTPS. Enquiries are stored in an access-controlled database, the server enforces validation and rate limits, and we apply spam and abuse protection. No online system is perfectly secure. If a data breach is likely to result in serious harm, we will follow the Notifiable Data Breaches scheme and notify affected people and the Office of the Australian Information Commissioner as required.</p>
<h2>7. How long we keep information</h2>
<p>We keep enquiry information for as long as we need it to respond to you, manage any resulting relationship and meet our legal obligations. When it is no longer needed we take reasonable steps to delete or de-identify it.</p>
<h2>8. Cookies, analytics and browser storage</h2>
<p>This website does not use advertising cookies, tracking pixels or third-party analytics. Your browser may keep short-lived data in session storage so that your calculator selections, design choices or a half-completed questionnaire are not lost, and so that retrying a failed submission does not create a duplicate enquiry. This data stays in your browser, is not sent to us unless you submit an enquiry, and is cleared when you close the tab or after a successful submission. If we add analytics or cookies in future, we will update this policy first.</p>
<h2>9. Access and correction</h2>
<p>You can ask for access to the personal information we hold about you and ask us to correct it if it is inaccurate, out of date or incomplete. You can also ask us to delete your enquiry. Contact us at {contact}. We will respond within a reasonable period, and we aim to do so within 30 days. We may need to verify your identity first. If we refuse a request we will explain why in writing and tell you how to complain.</p>
<h2>10. Questions and complaints</h2>
<p>If you have a question or concern about how we handle your personal information, contact us at {contact} and we will investigate and reply. If you are not satisfied with our response, you can complain to the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au/" target="_blank" rel="noopener">oaic.gov.au</a> or on {OAIC_PHONE}.</p>
<h2>11. Links to other websites</h2>
<p>This website links to other sites, including Milestone Development. We are not responsible for the privacy practices of other websites, so please read their policies.</p>
<h2>12. Changes to this policy</h2>
<p>We may update this policy from time to time. The effective date at the top shows when it last changed.</p>'''
    return _hero('WEBSITE INFORMATION', 'Privacy <em>Policy.</em>', 'How we collect, use and protect the information you share with us.') + _doc(body)


def terms_page(email: str, phone: str, phone_href: str, parent_url: str) -> str:
    contact = _contact(email, phone, phone_href)
    body = f'''<p class="fine-print">Effective {LEGAL_UPDATED}.</p>
<p>These Terms of Use apply to your use of milestonerenovate.com (the “website”). Milestone Renovate is a renovation brand operated under <a href="{parent_url}" target="_blank" rel="noopener">Milestone Development</a>, and “we” and “us” means Milestone Development operating as Milestone Renovate. Renovation building work is contracted by {COMPANY} (ACN {ACN}), NSW Contractor Licence <a href="{LICENCE_URL}" target="_blank" rel="noopener">{LICENCE}</a>. By using the website you agree to them. If you do not agree, please do not use the website.</p>
<h2>1. General information only</h2>
<p>The website provides general information about renovation planning, approvals and costs. It is not professional, legal, engineering, financial or building advice, and you should not rely on it as a substitute for advice about your property. Approvals, planning controls and building rules vary by property and change over time, so check requirements with your council, certifier or other qualified professional.</p>
<h2>2. No contract from the website</h2>
<p>Nothing on the website, and no enquiry, booking, questionnaire response or calculator result, is an offer, quotation, contract or promise to carry out work at a particular price or time. Quotations and building contracts are not issued by this website. They are issued by the contracting entity responsible for the work, which is named, together with its licence details, in the written quotation or contract you receive. Building work in New South Wales is carried out under a separate written contract with a licensed contractor. For residential building work above $5,000 (including GST) NSW law requires a written contract, and additional requirements such as Home Building Compensation insurance apply to larger jobs. These Terms are not a building contract and do not replace one. See <a href="https://www.nsw.gov.au/housing-and-construction/building-or-renovating-a-home/preparing/contracts" target="_blank" rel="noopener">NSW Government guidance on contracts</a>.</p>
<h2>3. Cost estimates</h2>
<p>The cost calculator gives indicative ranges based on published Sydney market information. It is not a Milestone Renovate quotation. Please read the <a href="/estimate-disclaimer">Cost Estimate Disclaimer</a>, which forms part of these Terms.</p>
<h2>4. Images</h2>
<p>Many images on the website are AI-generated concept imagery used for design discussion. They are not photographs of completed Milestone projects and do not show real client homes. Some portraits of team members are AI-edited images.</p>
<h2>5. Enquiries and your information</h2>
<p>When you submit an enquiry you agree to provide accurate information and to use the forms only for genuine renovation enquiries. We handle personal information as set out in our <a href="/privacy">Privacy Policy</a>.</p>
<h2>6. Acceptable use</h2>
<p>You must not misuse the website, including by attempting to gain unauthorised access, interfering with its operation, submitting false or abusive enquiries, sending automated or bulk submissions, or scraping it in a way that burdens the service.</p>
<h2>7. Intellectual property</h2>
<p>The website’s content, design, text, images and logos belong to us or our licensors and are protected by law. You may view and print pages for your own personal, non-commercial use. You may not copy, republish or commercially exploit the content without our written permission.</p>
<h2>8. Third-party links</h2>
<p>The website links to other websites, including Milestone Development and government sources. We do not control those sites and are not responsible for their content or practices.</p>
<h2>9. Availability and accuracy</h2>
<p>We try to keep the website accurate, up to date and available, but we do not guarantee that it will be error-free, uninterrupted or complete. We may change or remove content at any time.</p>
<h2>10. Your rights under Australian Consumer Law</h2>
<p>Nothing in these Terms excludes, restricts or modifies any right or remedy you have under the Australian Consumer Law or any other law that cannot lawfully be excluded, including the consumer guarantees that apply to services. See the <a href="https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees" target="_blank" rel="noopener">ACCC’s guidance on consumer rights and guarantees</a>.</p>
<h2>11. Limitation of liability</h2>
<p>To the extent the law allows, and subject to section 10, we are not liable for any loss or damage arising from your use of, or reliance on, the website or its general information and estimates. Where a non-excludable guarantee applies to goods or services we supply under a written contract, our liability is limited to the extent the law permits.</p>
<h2>12. Governing law</h2>
<p>These Terms are governed by the laws of New South Wales, Australia, and you submit to the non-exclusive jurisdiction of the courts of New South Wales.</p>
<h2>13. Changes and contact</h2>
<p>We may update these Terms from time to time. The effective date above shows when they last changed, and continued use of the website after a change means you accept the updated Terms. Questions can be sent to {contact}.</p>'''
    return _hero('WEBSITE INFORMATION', 'Terms <em>of Use.</em>', 'The terms that apply when you use this website.') + _doc(body)


def estimate_disclaimer_page(email: str, phone: str, phone_href: str, pricing_reviewed: str) -> str:
    contact = _contact(email, phone, phone_href)
    body = f'''<p class="fine-print">Effective {LEGAL_UPDATED}. Pricing information last reviewed {pricing_reviewed}.</p>
<h2>What the calculator shows</h2>
<p>The cost calculator produces an <strong>indicative range</strong> in Australian dollars and an indicative timeline. The ranges are based on published 2026 Sydney renovation cost guides and builder guides that we have reviewed and combined using the method described on the <a href="/bathroom-renovation-cost#how-it-works">calculator page</a>. They show what comparable projects have been reported to cost across the Sydney market. They are not Milestone Renovate’s prices.</p>
<h2>It is not a quote or a contract</h2>
<p>An estimate from this website is not a quotation, an offer, a fixed price or a contract, and it does not oblige us or you to do anything. A binding price can only be given in a written quotation or contract prepared after we have assessed your property, plans, selections and site conditions. Quotations and building contracts are not issued by this website. They are issued by the contracting entity responsible for the work, which is named, together with its licence details, in the written quotation or contract you receive. Residential building work in New South Wales requires a written contract above $5,000 (including GST). See <a href="https://www.nsw.gov.au/housing-and-construction/building-or-renovating-a-home/preparing/contracts" target="_blank" rel="noopener">NSW Government guidance</a>.</p>
<h2>What affects the real cost</h2>
<p>Actual costs depend on inspection, plans and engineering, product and finish selections, access, the age and condition of the building, hidden conditions found once walls and floors are opened, approvals, supplier lead times and the market at the time of the work. Your final cost can be lower or higher than the range shown.</p>
<h2>GST, inclusions and exclusions</h2>
<p>Ranges include GST. They assume a licensed contractor supplies and installs the standard scope for the selected project type. They do not include design or engineering fees, council or certifier fees, asbestos or hazardous material removal, structural or services upgrades beyond those you select, appliances for kitchens, furniture, or a contingency allowance for hidden conditions unless the calculator states otherwise. Allow a contingency on top of the range for older properties.</p>
<h2>Timelines</h2>
<p>Timelines are indicative, based on published guides, and exclude approvals and product lead times unless stated. Programme dates are confirmed in a written contract.</p>
<h2>Your consumer rights</h2>
<p>This disclaimer does not exclude, restrict or modify any right or remedy you have under the Australian Consumer Law or any other law that cannot lawfully be excluded. We do not make misleading claims about price: if you are given a written quotation, that document sets out the price and scope.</p>
<h2>Questions</h2>
<p>To ask for a detailed quote, use the “Request a detailed quote” button in the calculator or contact us at {contact}.</p>'''
    return _hero('COST PLANNER', 'Cost estimate <em>disclaimer.</em>', 'Please read this before relying on any estimate from this website.') + _doc(body)
