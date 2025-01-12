/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
   Button,
   Modal,
   TextField,
   Radio,
   RadioGroup,
   FormControlLabel,
   Box,
   Typography,
   FormHelperText,
} from '@mui/material';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { toast } from 'react-toastify';

import { createOrder, getRoomOrderTimeline } from '../../service';

import type { PaymentModalType } from './validation';

import useAuth from '~/app/redux/slices/auth.slice';
import { SETTINGS_CONFIG } from '~/app/configs/settings';

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

interface PaymentModalProps {
   isOpen: boolean;
   onClose: () => void;
   from: UseFormReturn<PaymentModalType>;
   rooms: any;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, from, rooms }) => {
   const { watch, setValue, getValues, setError } = from;
   const { user } = useAuth();
   const buttonSubmitRef = useRef<HTMLButtonElement>(null);
   const priceRef = useRef(0);
   const orderIdRef = useRef(null);

   const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

   const { data: dataRoomOrderTimeline } = getRoomOrderTimeline({
      roomIds: rooms.map((item: any) => item.room_id),
   } as any);

   const handleClose = async (res: any) => {
      console.log('Handle close called with response:', res);
      console.log('Current payment method:', paymentMethod);

      try {
         if (paymentMethod === 'card') {
            // Gọi API thanh toán ngay khi có order_id
            const paymentRequestData = {
               amount: res.data.total_money,
               orderId: res.data.order_id,
            };
            console.log('Sending payment request with data:', paymentRequestData);

            const response = await fetch(`${SETTINGS_CONFIG.API_URL}/order/add/payment`, {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
               },
               body: JSON.stringify(paymentRequestData),
            });

            const paymentData = await response.json();
            console.log('Payment API response:', paymentData);

            if (paymentData.success && paymentData.data?.vnpUrl) {
               // Chuyển hướng đến trang thanh toán VNPay
               window.location.href = paymentData.data.vnpUrl;
            } else {
               toast.error(paymentData.message || 'Có lỗi xảy ra khi tạo thanh toán');
            }
         } else {
            // Thanh toán tiền mặt
            onClose();
            from.reset();
            if (res?.data?.order_id) {
               toast.success('Đặt hàng thành công');
            }
         }
      } catch (error) {
         console.error('Payment process error:', error);
         toast.error('Có lỗi xảy ra trong quá trình thanh toán');
      }
   };

   const { mutate } = createOrder({
      onSuccess: async (res: any) => {
         console.log('Order created successfully:', res);
         
         if (paymentMethod === 'card') {
            try {
               const { order_id, total_money } = res.data;
               
               if (!order_id) {
                  throw new Error('Không tìm thấy order ID');
               }

               const paymentRequestData = {
                  amount: total_money,
                  orderId: order_id
               };

               const response = await fetch(`${SETTINGS_CONFIG.API_URL}/order/add/payment`, {
                  method: 'POST',
                  headers: {
                     'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(paymentRequestData),
               });

               const paymentData = await response.json();
               
               if (paymentData.success && paymentData.data?.vnpUrl) {
                  window.location.href = paymentData.data.vnpUrl;
               } else {
                  throw new Error(paymentData.message || 'Có lỗi xảy ra khi tạo thanh toán');
               }
            } catch (error) {
               console.error('Payment process error:', error);
               toast.error(error.message || 'Có lỗi xảy ra trong quá trình thanh toán');
            }
         } else {
            onClose();
            from.reset();
            toast.success('Đặt hàng thành công');
         }
      },
      onError: (error: any) => {
         console.error('Create order error:', error);
         toast.error(error.message || 'Có lỗi xảy ra khi tạo đơn hàng');
      }
   });

   const handlePaymentMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value as 'cash' | 'card';
      console.log('Payment method changed to:', newValue);
      setPaymentMethod(newValue);
   };

   const handleRoomChange = (index: number, field: 'start_time' | 'end_time', value: Date | null) => {
      const newRooms = [...watch('rooms')];
      const currentRoom = newRooms[index];

      if (field === 'start_time' && value) {
         const totalTimeInHours = currentRoom.total_time || 1;
         const end_time = new Date(value.getTime() + totalTimeInHours * 60 * 60 * 1000);
         console.log(end_time);
         setValue(`rooms[${index}].start_time`, dayjs(value).format('YYYY-MM-DD HH:mm:ss'));
         setValue(`rooms[${index}].end_time`, dayjs(end_time).format('YYYY-MM-DD HH:mm:ss'));
      } else if (field === 'end_time' && value) {
         const startTime = currentRoom.start_time;
         if (startTime) {
            const totalTimeInMilliseconds = value.getTime() - new Date(startTime).getTime();
            const totalTimeInHours = Math.max(1, totalTimeInMilliseconds / (1000 * 60 * 60));

            setValue(`rooms[${index}].total_time`, totalTimeInHours);
            setValue(`rooms[${index}].end_time`, dayjs(value).format('YYYY-MM-DD HH:mm:ss'));
         }
      }
   };

   const onSubmit: SubmitHandler<PaymentModalType> = async (data) => {
      try {
         const formattedData = {
            ...data,
            payment_method: paymentMethod === 'card' ? 2 : 1,
            user_id: user?.id
         };

         const response = await createOrder(formattedData);
         
         // Kiểm tra response và lấy order_id
         const orderData = response?.data;
         if (!orderData || !orderData.order_id) {
            throw new Error('Không nhận được thông tin đơn hàng');
         }

         if (paymentMethod === 'card') {
            // Xử lý thanh toán qua thẻ
            window.location.href = `${SETTINGS_CONFIG.API_URL}/payment/process/${orderData.order_id}`;
         } else {
            // Thanh toán tiền mặt
            toast.success('Đặt phòng thành công!');
            onClose();
         }
      } catch (error) {
         console.error('Payment error:', error);
         toast.error('Có lỗi xảy ra khi xử lý thanh toán');
      }
   };

   return (
      <Modal open={isOpen} onClose={onClose}>
         <Box sx={style}>
            <Typography variant="h5" p={2}>
               Thông tin đặt phòng
            </Typography>
            <form onSubmit={from.handleSubmit(onSubmit)}>
               <Box p={2} pt={0}>
                  {getValues('rooms').map((room, index) => (
                     <Box key={room.room_id} mb={2}>
                        <Typography mb={1}>Phòng {room.room_id}</Typography>
                        <Box display="flex" justifyContent="space-between" gap={2}>
                           <Box>
                              <TextField
                                 label="Thời gian bắt đầu"
                                 type="datetime-local"
                                 value={watch(`rooms[${index}.start_time]`)}
                                 onChange={(e) => handleRoomChange(index, 'start_time', new Date(e.target.value))}
                                 InputLabelProps={{ shrink: true }}
                              />
                              {from.formState.errors?.rooms?.[index]?.start_time && (
                                 <FormHelperText
                                    variant="standard"
                                    sx={({ palette }) => ({ color: palette.error.main, ml: 1 })}
                                 >
                                    {from.formState.errors.rooms[index].start_time.message}
                                 </FormHelperText>
                              )}
                           </Box>
                           <Box>
                              <TextField
                                 label="Thời gian kết thúc"
                                 type="datetime-local"
                                 value={watch(`rooms[${index}.end_time]`)}
                                 onChange={(e) => handleRoomChange(index, 'end_time', new Date(e.target.value))}
                                 InputLabelProps={{ shrink: true }}
                              />
                              {from.formState.errors?.rooms?.[index]?.end_time && (
                                 <FormHelperText
                                    variant="standard"
                                    sx={({ palette }) => ({ color: palette.error.main, ml: 1 })}
                                 >
                                    {from.formState.errors.rooms[index].end_time.message}
                                 </FormHelperText>
                              )}
                           </Box>
                        </Box>
                     </Box>
                  ))}
                  <Box width="max-content">
                     <RadioGroup
                        value={paymentMethod}
                        onChange={handlePaymentMethodChange}
                        name="payment-method"
                        sx={{ mt: 2 }}
                     >
                        <FormControlLabel
                           value="cash"
                           control={<Radio />}
                           label="Tiền mặt"
                        />
                        <FormControlLabel
                           value="card"
                           control={<Radio />}
                           label="Thẻ ngân hàng"
                        />
                     </RadioGroup>
                  </Box>
                  <Box display="flex" justifyContent="end" gap={2} mt={3}>
                     <Button variant="outlined" color="error" onClick={onClose}>
                        Hủy
                     </Button>
                     <Button type="submit" variant="contained">
                        Xác nhận
                     </Button>
                  </Box>
               </Box>
            </form>
         </Box>
      </Modal>
   );
};

const style = {
   position: 'absolute',
   top: '50%',
   left: '50%',
   transform: 'translate(-50%, -50%)',
   width: 520,
   bgcolor: 'background.paper',
   borderRadius: 2,
   boxShadow: 24,
};

export default PaymentModal;
