import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

export const getStats = () => api.get('/stats').then(r => r.data);
export const getBusinesses = () => api.get('/businesses').then(r => r.data);
export const createBusiness = (data) => api.post('/businesses', data).then(r => r.data);
export const updateBusiness = (id, data) => api.put(`/businesses/${id}`, data).then(r => r.data);
export const deleteBusiness = (id) => api.delete(`/businesses/${id}`).then(r => r.data);

export const getListings = () => api.get('/listings').then(r => r.data);
export const getListing = (id) => api.get(`/listings/${id}`).then(r => r.data);
export const createListing = (data) => api.post('/listings', data).then(r => r.data);
export const updateListing = (id, data) => api.put(`/listings/${id}`, data).then(r => r.data);
export const deleteListing = (id) => api.delete(`/listings/${id}`).then(r => r.data);

export const uploadPhotos = (listingId, files, caption = '') => {
  const form = new FormData();
  files.forEach(f => form.append('photos', f));
  form.append('caption', caption);
  return api.post(`/listings/${listingId}/photos/upload`, form).then(r => r.data);
};

export const generatePhoto = (listingId, prompt = '') =>
  api.post(`/listings/${listingId}/photos/generate`, { prompt }).then(r => r.data);

export const deletePhoto = (id) => api.delete(`/photos/${id}`).then(r => r.data);
export const removeWatermark = (id) => api.post(`/photos/${id}/remove-watermark`).then(r => r.data);

export const photoUrl = (filename) => `http://localhost:3001/uploads/${filename}`;

export const getActivity = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/activity${q ? '?' + q : ''}`).then(r => r.data);
};
export const logActivity = (data) => api.post('/activity', data).then(r => r.data);
export const deleteActivity = (id) => api.delete(`/activity/${id}`).then(r => r.data);
