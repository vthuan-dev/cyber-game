/* eslint-disable import/order */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { Provider } from 'react-redux';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import './styles/global.css';

import { store } from './app/redux';

import { resources } from '@language';

import App from './app';
import { LANGUAGE, LOCALSTORAGE_LANGUAGE_KEY } from '@constants';
import { ScrollbarBase } from './app/components/design-systems/ScrollbarBase';

void i18next.init({
   resources,
   interpolation: { escapeValue: false },
   lng: localStorage.getItem(LOCALSTORAGE_LANGUAGE_KEY)
      ? localStorage.getItem(LOCALSTORAGE_LANGUAGE_KEY) === LANGUAGE.VI
         ? LANGUAGE.VI
         : LANGUAGE.EN
      : LANGUAGE.VI,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
   <React.Fragment>
      <Provider store={store}>
         <I18nextProvider i18n={i18next}>
            <ScrollbarBase>
               <App />
               <ToastContainer
                  position="top-right"
                  autoClose={3000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
               />
            </ScrollbarBase>
         </I18nextProvider>
      </Provider>
   </React.Fragment>,
);
