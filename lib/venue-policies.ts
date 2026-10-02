import {z} from 'zod';

export const MAX_VENUE_POLICIES_LENGTH=10000;

// Existing listings have no policy text; the default keeps them readable and editable.
export const venuePoliciesSchema=z.string().trim().max(MAX_VENUE_POLICIES_LENGTH).default('');
