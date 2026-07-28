/**
 * documentAuthenticityTerms.js — Static legal copy shown alongside the
 * Request Form Document upload on the Submit Blood Request form.
 *
 * Same reasoning as constants/termsAndConditions.js (Vol/Phleb
 * registration): kept as a constant, not hardcoded inline in
 * bloodRequestSubmitUI.js —
 * - It's long-form static content unrelated to DOM/event logic.
 * - Legal text gets revised independently of form behavior.
 * - Matches rules.md's layer split: UI files own DOM + handlers, not
 *   unrelated static content.
 *
 * Structured as an array of sections ({ heading, body }) rather than one
 * HTML string, so the modal can render it with createElement/textContent
 * only — never innerHTML — per the project's security rule.
 *
 * ⚠ General information, not legal advice, and has NOT been reviewed by
 * counsel. The citations below were checked against the Official
 * Gazette's published text of RA 10175 and secondary legal sources before
 * writing this:
 *   - RA 10175 Section 4(b)(1) — Computer-related Forgery (input,
 *     alteration, or use of computer data to make it appear authentic).
 *   - RA 10175 Section 6 — when a Revised Penal Code offense is committed
 *     through a computer system, the penalty is one degree higher than
 *     the RPC penalty alone.
 *   - Revised Penal Code Article 172, in relation to Article 171 —
 *     falsification by a private individual / use of a falsified
 *     document.
 * Article 154 RPC (Unlawful Use of Means of Publication — "fake news")
 * was deliberately NOT cited here despite appearing in some informal
 * sources on this topic: it covers publishing false news that endangers
 * public order, not submitting a single falsified private document to an
 * organization, so it doesn't fit this specific act. Actual criminal
 * liability always depends on the specific facts of a case as determined
 * by a court — swap in PRC/legal-approved language before this ships if
 * the organization wants formally reviewed wording.
 *
 * Path: frontend/js/constants/documentAuthenticityTerms.js
 */

export const DOCUMENT_TERMS_VERSION = '2026-07-28';

// Short reminder shown just above the checkbox on the Submit Request
// form — full detail lives in DOCUMENT_AUTHENTICITY_TERMS below, opened
// via a "Learn more" link/modal, same pattern as TERMS_SUMMARY in
// termsAndConditions.js.
export const DOCUMENT_TERMS_SUMMARY =
  'Uploading a fake, altered, or falsified request form may result in ' +
  'your BloodSync account being suspended or banned, and may also be a ' +
  'criminal offense in the Philippines under the Cybercrime Prevention ' +
  'Act of 2012 (RA 10175) and the Revised Penal Code. Please upload ' +
  'only a genuine, unaltered document issued by the hospital.';

export const DOCUMENT_AUTHENTICITY_TERMS = [
  {
    heading: 'Why this matters',
    body:
      'The request form document you upload here is reviewed by PRC ' +
      'branch staff to confirm that a real hospital, doctor, or patient ' +
      'genuinely needs blood before any units are reserved or released. ' +
      'A falsified form can delay or divert blood units away from ' +
      'patients who actually need them, so PRC treats document ' +
      'authenticity seriously.',
  },
  {
    heading: 'What happens if a document is found to be falsified',
    body:
      'A request submitted with a document that PRC staff determine to ' +
      'be fake, altered, or not genuinely issued by the named hospital ' +
      'will be rejected, and your BloodSync account may be suspended or ' +
      'permanently banned at PRC\'s discretion. Depending on the ' +
      'circumstances, PRC may also refer confirmed cases of falsified ' +
      'documents to the appropriate authorities for further action.',
  },
  {
    heading: 'Possible legal consequences',
    body:
      'Beyond account action, uploading, altering, or submitting a ' +
      'falsified document through this system may constitute ' +
      'computer-related forgery under Section 4(b)(1) of the Cybercrime ' +
      'Prevention Act of 2012 (Republic Act No. 10175), and/or ' +
      'falsification by a private individual under Article 172, in ' +
      'relation to Article 171, of the Revised Penal Code. Under ' +
      'Section 6 of RA 10175, when a falsification offense under the ' +
      'Revised Penal Code is committed through a computer system, the ' +
      'penalty is one degree higher than it would otherwise be. Whether ' +
      'these provisions actually apply depends on the specific facts of ' +
      'a case, not just on a document turning out to be false — see the ' +
      'note below.',
  },
  {
    heading: 'A note on this information',
    body:
      'This summary is provided for general information only and is ' +
      'not legal advice. Whether a specific act constitutes a crime, ' +
      'and what penalty would apply, depends on the full facts of a ' +
      'case as determined by a court. If you have questions about your ' +
      'legal obligations, consult a lawyer.',
  },
];