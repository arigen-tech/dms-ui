import apiClient from "./apiClient";

export const getRequest = async (url, config = {}) => {
  const res = await apiClient.get(url, config);
  return res.data;
};

export const postRequest = async (url, data, config = {}) => {
  const res = await apiClient.post(url, data, config);
  return res.data;
};

export const putRequest = async (url, data, config = {}) => {
  const res = await apiClient.put(url, data, config);
  return res.data;
};

export const deleteRequest = async (url, config = {}) => {
  const res = await apiClient.delete(url, config);
  return res.data;
};
