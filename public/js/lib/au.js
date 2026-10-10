// Australian input helpers shared by the browser forms and the server schema (no dependencies).

/** Strip formatting from an Australian phone number; +61 / 61 become a leading 0. */
export function normalisePhone(raw) {
  return String(raw).replace(/[\s().-]/g, '').replace(/^\+61/, '0').replace(/^61(?=[2-478]\d{8}$)/, '0');
}

const LANDLINE_OR_MOBILE = /^0[2-478]\d{8}$/;
const SERVICE_NUMBER = /^(13\d{4}|1[38]00\d{6})$/;

/** @param {string} normalised output of normalisePhone */
export const isAuPhone = (normalised) => LANDLINE_OR_MOBILE.test(normalised) || SERVICE_NUMBER.test(normalised);

/** Australian postcodes are four digits, 0200 and above. */
export const isAuPostcode = (value) => /^\d{4}$/.test(value) && Number(value) >= 200;

export const isEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254;
