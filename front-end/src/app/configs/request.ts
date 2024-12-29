import axiosInstance from './axiosInstance';

export const getRequest = async (url: string, params?: Record<string, any>) => {
  const response = await axiosInstance.get(url, { params });
  return response.data;
};

export const postRequest = async (url: string, data?: any) => {
  const response = await axiosInstance.post(url, data);
  return response.data;
};

export const putRequest = async (url: string, data?: any) => {
  const response = await axiosInstance.put(url, data);
  return response.data;
};

export const deleteRequest = async (url: string) => {
  const response = await axiosInstance.delete(url);
  return response.data;
}; 