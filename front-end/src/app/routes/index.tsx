import { useRoutes, type RouteObject } from 'react-router-dom';

import clientRoutes from './client-route';
import adminRoutes from './admin-route';
import PublicRouter from './components/public-route';

import { ROUTE_PATH } from '~/app/constants';
import SignIn from '~/app/pages/sign-in';
import Register from '@pages/register';
import SaveOnlinePayment from '@pages/clients/Cart/components/SaveOnlinePayment';
import PaymentCallback from '../pages/clients/Cart/components/PaymentCallback';

const routes = (): RouteObject[] => {
   return [
      /**
       * Route Public
       * Route sign-in
       */
      {
         path: ROUTE_PATH.SIGN_IN,
         element: (
            <PublicRouter>
               <SignIn />
            </PublicRouter>
         ),
      },
      {
         path: ROUTE_PATH.REGISTER,
         element: (
            <PublicRouter>
               <Register />
            </PublicRouter>
         ),
      },

      adminRoutes,
      clientRoutes,
      {
         path: 'payment',
         element: <SaveOnlinePayment />
      },

      /**
       * Nod found route 404
       */
      {
         path: '*',
         element: <>404</>,
      },

      {
         path: '/payment/callback/vnpay_return',
         element: <PaymentCallback />
      }
   ];
};

export default function Routers() {
   return useRoutes(routes());
}
