/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import createInstance from '../api/axios-config';
import { SETTINGS_CONFIG } from '../settings';

const baseApi = createInstance(SETTINGS_CONFIG.API_URL);

export const getRequest = (url: string, config?: AxiosRequestConfig): Promise<any> => {
   return new Promise((resolve, reject) => {
      baseApi
         .get(url, config)
         .then((res: AxiosResponse) => resolve(res))
         .catch((err: AxiosError) => {
            console.error('Error details:', err);
            reject(err);
         });
   });
};

export const postRequest = (url: string, data: any, config?: AxiosRequestConfig): Promise<any> => {
   return new Promise((resolve, reject) => {
      baseApi
         .post(url, data, config)
         .then((res: AxiosResponse) => {
            if (res?.data?.data) {
               resolve(res.data);
            } else {
               resolve(res);
            }
         })
         .catch((err: AxiosError) => reject(err));
   });
};

export const putRequest = (url: string, data: any, config?: AxiosRequestConfig): Promise<any> => {
   return new Promise((resolve, reject) => {
      baseApi
         .put(url, data, config)
         .then((res: AxiosResponse) => resolve(res?.data))
         .catch((err: AxiosError) => reject(err));
   });
};

export const deleteRequest = (url: string): Promise<any> => {
   return new Promise((resolve, reject) => {
      baseApi
         .delete(url)
         .then((res: AxiosResponse) => resolve(res?.data))
         .catch((err: AxiosError) => reject(err));
   });
};
