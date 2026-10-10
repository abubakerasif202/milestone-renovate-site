import { z } from 'zod';
import { isAuPhone, normalisePhone } from '../public/js/lib/au.js';

export const CATEGORIES = ['kitchen', 'bathroom', 'whole_home', 'extension', 'other'];
export const BUDGETS = ['under_50k', '50k_100k', '100k_250k', '250k_plus', 'discuss'];
export const TIMELINES = ['asap', '3_6_months', '6_plus_months', 'exploring'];
export const SOURCES = ['contact-form', 'wizard', 'calculator'];
export const PROPERTY_TYPES = ['house', 'townhouse', 'apartment', 'strata_unit', 'other'];
export const ROOM_SIZES = ['small', 'medium', 'large', 'not_sure'];
export const FINISH_LEVELS = ['essential', 'mid_range', 'premium', 'not_sure'];
export const LAYOUT_CHANGES = ['none', 'minor', 'major', 'not_sure'];
export const SCOPE_OPTIONS = [
  'new_layout', 'new_cabinetry', 'new_benchtops', 'new_appliances', 'relocate_plumbing',
  'new_tiling', 'new_fixtures', 'waterproofing', 'walk_in_shower', 'accessibility',
  'structural_changes', 'new_flooring', 'painting', 'lighting_electrical',
  'single_storey_extension', 'second_storey', 'open_plan', 'outdoor_connection',
];

export const CONSENT_VERSION = '2026-10-v1';

export { normalisePhone, isAuPhone };

const blankToUndefined = (value) => (value === '' || value === null ? undefined : value);
const optional = (schema) => z.preprocess(blankToUndefined, schema.optional());

const wizardSchema = z
  .object({
    propertyType: optional(z.enum(PROPERTY_TYPES)),
    scope: z.array(z.enum(SCOPE_OPTIONS)).max(12).optional(),
    roomSize: optional(z.enum(ROOM_SIZES)),
    finishLevel: optional(z.enum(FINISH_LEVELS)),
    layoutChange: optional(z.enum(LAYOUT_CHANGES)),
  })
  .strict();

export const enquirySchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    name: z.string().trim().min(2, 'Please enter your full name.').max(120),
    phone: z
      .string()
      .trim()
      .transform(normalisePhone)
      .refine(isAuPhone, 'Please enter a valid Australian phone number.'),
    email: z.string().trim().toLowerCase().max(254).email('Please enter a valid email address.'),
    suburb: optional(z.string().trim().min(2).max(80)),
    postcode: optional(
      z.string().trim().regex(/^\d{4}$/, 'Postcode must be 4 digits.').refine((p) => Number(p) >= 200, 'Please enter a valid Australian postcode.'),
    ),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Please choose a renovation type.' }) }),
    budgetRange: optional(z.enum(BUDGETS)),
    timeline: optional(z.enum(TIMELINES)),
    details: optional(z.string().trim().max(4000, 'Please keep project details under 4,000 characters.')),
    source: z.enum(SOURCES),
    sourcePage: optional(z.string().max(200).regex(/^\/[A-Za-z0-9\-_/]*$/)),
    consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm you agree to us contacting you about your enquiry.' }) }),
    wizard: wizardSchema.optional(),
    formStartedAt: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.suburb && !data.postcode) {
      ctx.addIssue({ code: 'custom', path: ['postcode'], message: 'Please enter your suburb or postcode.' });
    }
    if (data.source === 'contact-form' && (data.details?.length ?? 0) < 10) {
      ctx.addIssue({ code: 'custom', path: ['details'], message: 'Please tell us a little about your project (at least 10 characters).' });
    }
    if (data.source !== 'contact-form' && !data.wizard) {
      ctx.addIssue({ code: 'custom', path: ['wizard'], message: 'Questionnaire answers are required.' });
    }
  });

/** Flatten zod issues into { field: message } for the UI. */
export function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ?? 'form';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
