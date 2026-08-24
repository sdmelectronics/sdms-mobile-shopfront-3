/**
 * Single source of truth for the shop's contact details.
 *
 * These used to be hardcoded across a dozen components, so changing a phone
 * number or the shop address meant hunting through the codebase and inevitably
 * missing one. Import from here instead of typing a number inline.
 */

export interface PhoneNumber {
  /** How the number is shown to customers (local Ugandan format). */
  label: string;
  /** International format — always use this for tel: links so the number
   *  dials correctly from any network, and from abroad. */
  tel: string;
}

export const PHONE_NUMBERS: PhoneNumber[] = [
  { label: '0755 869 853', tel: '+256755869853' },
  { label: '0705 095 221', tel: '+256705095221' },
];

/** The line used for single-action shortcuts where only one can be dialled. */
export const PRIMARY_PHONE = PHONE_NUMBERS[0];

/** WhatsApp is tied to one account, so it is deliberately a single number. */
export const WHATSAPP_NUMBER = '256755869853';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const CONTACT_EMAIL = 'sdmelectronics256@gmail.com';

export const SHOP_ADDRESS = {
  line1: 'Arua Park Plaza, Shop C2-386',
  line2: 'Kampala, Uganda',
};
