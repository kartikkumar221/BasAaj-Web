/**
 * Module-level registry that keeps File objects alive across React Router
 * navigations within the same browser session (no page reload happens in an SPA).
 * PostOffer stores files here; ReviewOffer retrieves them by ID for upload.
 */
export const mediaFileRegistry = new Map<string, File>();
