/**
 * termsAndConditions.js — Static legal copy shown in the Terms & Conditions
 * modal on Volunteer/Phlebotomist registration.
 *
 * Kept as a constant, not hardcoded inline in fieldRegistrationUI.js:
 * - It's long-form static content unrelated to DOM/event logic.
 * - Legal text gets revised independently of form behavior — isolating it
 *   means a copy change never touches the UI file's diff.
 * - Matches rules.md's layer split: UI files own DOM + handlers, not
 *   unrelated static content.
 *
 * Structured as an array of sections ({ heading, body }) rather than one
 * HTML string, so the modal can render it with createElement/textContent
 * only — never innerHTML — per the project's security rule.
 *
 * ⚠ Placeholder legal text — written to reflect the Data Privacy Act of
 * 2012 (RA 10173) at a plain-language level for a volunteer registration
 * flow. This has NOT been reviewed by counsel. Treat as a starting draft;
 * swap in PRC/legal-approved language before this ships to real users.
 *
 * Path: frontend/js/constants/termsAndConditions.js
 */

export const TERMS_AND_CONDITIONS_VERSION = '2026-07-17';

// Short front-notes summary shown at the top of the registration form,
// before any personal fields are collected — so the privacy notice is
// seen first, not buried near the submit button. Full detail lives in
// TERMS_AND_CONDITIONS below, opened via the "Terms and Conditions" link.
export const TERMS_SUMMARY =
  'We collect your name, contact details, and general address (down to ' +
  'barangay level only) to verify your registration, coordinate nearby ' +
  'blood drives, and contact you about your application, never to sell ' +
  'or share beyond the Philippine Red Cross Batangas Chapter. This is ' +
  'processed under the Data Privacy Act of 2012 (RA 10173). Please read ' +
  'the full terms before continuing.';

export const TERMS_AND_CONDITIONS = [
  {
    heading: 'Why we collect this information',
    body:
      'BloodSync collects your name, contact details, birthdate, and ' +
      'address so the Philippine Red Cross can verify your identity, ' +
      'assign you to nearby blood drives, and contact you about your ' +
      'volunteer or phlebotomist application. Address information ' +
      '(province, city/municipality, barangay) is also used to estimate ' +
      'your general location so the system can suggest blood drives near ' +
      'you, this is barangay-level only, not an exact address pin.',
  },
  {
    heading: 'Your consent under the Data Privacy Act of 2012 (RA 10173)',
    body:
      'By checking "I agree to the Terms and Conditions" and submitting ' +
      'this form, you consent to the collection and processing of your ' +
      'personal information as described here, in accordance with the ' +
      'Data Privacy Act of 2012 (Republic Act No. 10173) and its ' +
      'Implementing Rules and Regulations. Processing is limited to the ' +
      'purposes stated in this notice: account verification, blood drive ' +
      'coordination, and communication related to your volunteer or ' +
      'phlebotomist status.',
  },
  {
    heading: 'How your information is used',
    body:
      'Your submitted details are reviewed by an admin to approve or ' +
      'decline your registration. Approved accounts may have their name, ' +
      'general location, and role shown to PRC staff when assigning ' +
      'volunteers/phlebotomists to a blood drive. Your information is not ' +
      'sold, and is not shared with parties outside the Philippine Red ' +
      'Cross Batangas Chapter except where required by law.',
  },
  {
    heading: 'Your rights as a data subject',
    body:
      'Under RA 10173, you have the right to be informed, to access your ' +
      'data, to request correction of inaccurate data, to object to ' +
      'processing, and to request deletion of your data, subject to ' +
      'legal and record-keeping requirements. To exercise these rights, ' +
      'contact the PRC Batangas Chapter branch you registered under.',
  },
  {
    heading: 'Data retention and security',
    body:
      'Your information is retained for as long as your account remains ' +
      'active, or as required by applicable record-keeping rules for ' +
      'blood donation programs. Reasonable technical and organizational ' +
      'measures are used to protect your data against unauthorized ' +
      'access, alteration, or disclosure.',
  },
  {
    heading: 'Declined or unused registrations',
    body:
      'If your registration is declined, or if you do not complete ' +
      'registration, your submitted information may still be retained ' +
      'temporarily for administrative purposes before removal.',
  },
];