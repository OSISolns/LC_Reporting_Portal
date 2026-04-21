import api from './axios';

export const lookupSIDs = (sids) => api.post('/sukraa/lookup', { sids });
