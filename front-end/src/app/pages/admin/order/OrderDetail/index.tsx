/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
import {
   Box,
   Grid,
   Typography,
   Button,
   Card,
   CardContent,
   CardHeader,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   IconButton,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   TextField,
   MenuItem,
   Chip,
   Divider,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useState, useMemo } from 'react';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CircleIcon from '@mui/icons-material/Circle';
import PaidIcon from '@mui/icons-material/Paid';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import StarsIcon from '@mui/icons-material/Stars';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { ROUTE_PATH } from '@constants';
import BaseBreadcrumbs from '@components/design-systems/BaseBreadcrumbs/BaseBreadcrumbs';
import { getRequest, putRequest, postRequest } from '~/app/configs';

const breadcrumbs = [
   {
      title: 'Trang Chủ',
      link: ROUTE_PATH.ADMIN_HOME,
   },
];

export const ORDER_STATUS = Object.freeze({
   PENDING: 'PENDING', // trống
   CONFIRMED: 'CONFIRMED', // đã xác nhận đặt
   CHECKED_IN: 'CHECKED_IN', // đẵ đến
   CHECKED_OUT: 'CHECKED_OUT', // đã trả phòng
   CANCELLED: 'CANCELLED', // hủy
});

// Cấu trúc nhãn trạng thái đơn hàng bằng tiếng Việt
export const ORDER_STATUS_LABELS = Object.freeze({
   PENDING: 'Đang chờ xác nhận',
   CONFIRMED: 'Đã xác nhận',
   CHECKED_IN: 'Đã thanh toán',
   CHECKED_OUT: 'Hoàn thành',
   CANCELLED: 'Đã hủy',
   PAID: 'Đã thanh toán',
});

export type OrderStatusKey = keyof typeof ORDER_STATUS;

// Hàm lấy trạng thái tiếp theo với kiểu dữ liệu cụ thể
export const getNextStatus = (currentStatus: OrderStatusKey): OrderStatusKey => {
   switch (currentStatus) {
      case 'PENDING':
         return 'CONFIRMED';
      case 'CONFIRMED':
         return 'CHECKED_IN';
      case 'CHECKED_IN':
         return 'CHECKED_OUT';
      default:
         return currentStatus;
   }
};

export const statusButtonColors = {
   CONFIRMED: 'info', // or any specific color, e.g., 'primary'
   CHECKED_IN: 'warning',
   CHECKED_OUT: 'success',
   CANCELLED: 'error',
};

interface ChangeRoomRequest {
   orderId: number;
   orderDetailId: number;
   oldRoomId: number;
   newRoomId: number;
   startTime: string;
   endTime: string;
}

const OrderDetail = () => {
   const { id } = useParams();
   const queryClient = useQueryClient();

   const { data, refetch } = useQuery<{ data: OrderResponse }>({
      queryKey: ['order', id],
      queryFn: () => getRequest(`/order/detail/${id}`),
   });
   const order = data?.data;

   // Format lại response để hiển thị giá tiền
   const formatPrice = (price: number | string | undefined) => {
      if (!price || price === 0) return '0';
      const numPrice = typeof price === 'string' ? parseFloat(price) : price;
      return numPrice.toLocaleString('vi-VN');
   };

   const currentStatus = order?.order_status as OrderStatusKey | undefined;
   const nextStatus = currentStatus ? getNextStatus(currentStatus) : undefined;

   const { mutate: updateStatusRoom } = useMutation({
      mutationFn: () =>
         putRequest(`/room/update/${id}`, {
            status: nextStatus === 'CHECKED_IN' ? 'ACTIVE' : 'INACTIVE',
         }),
   });

   const { mutate } = useMutation({
      mutationFn: () =>
         putRequest(`/order/update/${order?.order_id}`, {
            status: nextStatus,
         }),
      onSuccess: () => {
         refetch();
         (nextStatus === 'CHECKED_IN' || nextStatus === 'CHECKED_OUT') && updateStatusRoom();
         toast.success('Cập nhật trạng thái thành công');
      },
   });

   const { mutate:mutateCancel } = useMutation({
      mutationFn: () =>
         putRequest(`/order/update/${order?.order_id}`, {
            status: "CANCELLED",
            username: order?.user?.username,
            email: order?.user?.email,
         }),
      onSuccess: () => {
         refetch();
         (nextStatus === 'CHECKED_IN' || nextStatus === 'CHECKED_OUT') && updateStatusRoom();
         toast.success('Cập nhật trạng thái thành công');
      },
   });

   const [changeRoomOpen, setChangeRoomOpen] = useState(false);
   const [selectedRoom, setSelectedRoom] = useState<any>(null);
   const [newRoomId, setNewRoomId] = useState<string>('');
   const [newStartTime, setNewStartTime] = useState<string>('');
   const [newEndTime, setNewEndTime] = useState<string>('');

   const { data: availableRooms, refetch: refetchAvailableRooms } = useQuery({
      queryKey: ['available-rooms', selectedRoom?.start_time, selectedRoom?.end_time],
      queryFn: () => getRequest('/order-room-detail/available-rooms', {
         params: {
            startTime: dayjs(selectedRoom?.start_time).utc().format('YYYY-MM-DD HH:mm:ss'),
            endTime: dayjs(selectedRoom?.end_time).utc().format('YYYY-MM-DD HH:mm:ss')
         }
      }),
      enabled: changeRoomOpen && !!selectedRoom,
   });

   const { mutate: mutateChangeRoom, isLoading: isChangingRoom } = useMutation({
      mutationFn: (data: any) => {
         return postRequest('/order-room-detail/change-room', data);
      },
      onSuccess: () => {
         toast.success('Đổi phòng thành công');
         setChangeRoomOpen(false);
         setSelectedRoom(null);
         setNewRoomId('');
         queryClient.invalidateQueries(['order', id]);
         queryClient.invalidateQueries(['available-rooms']);
         refetch();
      },
      onError: (error: any) => {
         console.error('Change room error:', error?.response?.data || error);
         toast.error(error?.response?.data?.message || 'Đổi phòng thất bại. Vui lòng thử lại');
      },
   });

   const handleRoomChange = (room: OrderRoom) => {
      console.log('Original room data:', room);
      
      // Đảm bảo có đủ thông tin cần thiết
      const roomData = {
         id: room.id,                // ID của room_order_detail
         room_id: room.room_id,      // ID của room
         room_name: room.room_name,
         start_time: room.start_time,
         end_time: room.end_time,
         total_price: room.total_price,
         total_time: room.total_time
      };
      
      console.log('Room data before setting:', roomData);
      setSelectedRoom(roomData);
      setChangeRoomOpen(true);
   };

   const handleChangeRoom = () => {
      if (!selectedRoom || !newRoomId) {
         toast.error('Vui lòng chọn phòng');
         return;
      }

      const orderId = Number(order?.order_id);
      const orderDetailId = Number(selectedRoom.id);
      const oldRoomId = Number(selectedRoom.room_id);
      const newRoomIdNum = Number(newRoomId);

      // Sử dụng thời gian mới nếu có, nếu không sử dụng thời gian cũ
      const startTime = newStartTime 
         ? dayjs(newStartTime).utc().format('YYYY-MM-DD HH:mm:ss')
         : dayjs(selectedRoom.start_time).utc().format('YYYY-MM-DD HH:mm:ss');
      
      const endTime = newEndTime
         ? dayjs(newEndTime).utc().format('YYYY-MM-DD HH:mm:ss')
         : dayjs(selectedRoom.end_time).utc().format('YYYY-MM-DD HH:mm:ss');

      const changeRoomData = {
         orderId,
         orderDetailId,
         oldRoomId,
         newRoomId: newRoomIdNum,
         startTime,
         endTime
      };

      console.log('Change room request data:', changeRoomData);
      mutateChangeRoom(changeRoomData);
   };

   const RoomChangeDialog = () => (
      <Dialog
         open={changeRoomOpen}
         onClose={() => {
            setChangeRoomOpen(false);
            setSelectedRoom(null);
            setNewRoomId('');
            setNewStartTime('');
            setNewEndTime('');
         }}
         maxWidth="sm"
         fullWidth
      >
         <DialogTitle>
            {selectedRoom ? `Đổi phòng ${selectedRoom.room_name}` : 'Đổi phòng'}
         </DialogTitle>
         <DialogContent sx={{ px: 3, py: 2 }}>
            <Box>
               {selectedRoom && (
                  <Box 
                     sx={{ 
                        mb: 3,
                        p: 2.5,
                        bgcolor: 'primary.lighter',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'primary.light'
                     }}
                  >
                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <MeetingRoomIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="subtitle1" color="primary.main" fontWeight={600}>
                           {selectedRoom.room_name}
                        </Typography>
                     </Box>

                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                 Thời gian đặt
                              </Typography>
                              <Typography variant="body2">
                                 {dayjs(selectedRoom.start_time).format('DD/MM/YYYY HH:mm')} - 
                                 {dayjs(selectedRoom.end_time).format('DD/MM/YYYY HH:mm')}
                              </Typography>
                           </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <PaidIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                 Giá hiện tại
                              </Typography>
                              <Typography variant="body2" fontWeight={500} color="error.main">
                                 {Number(selectedRoom.total_price).toLocaleString()}đ
                              </Typography>
                           </Box>
                        </Box>
                     </Box>

                     <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                           Thời gian đặt mới (không bắt buộc):
                        </Typography>
                        <Grid container spacing={2}>
                           <Grid item xs={6}>
                              <TextField
                                 type="datetime-local"
                                 label="Thời gian bắt đầu"
                                 fullWidth
                                 value={newStartTime}
                                 onChange={(e) => setNewStartTime(e.target.value)}
                                 InputLabelProps={{ shrink: true }}
                                 sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                       borderRadius: 2
                                    }
                                 }}
                              />
                           </Grid>
                           <Grid item xs={6}>
                              <TextField
                                 type="datetime-local"
                                 label="Thời gian kết thúc"
                                 fullWidth
                                 value={newEndTime}
                                 onChange={(e) => setNewEndTime(e.target.value)}
                                 InputLabelProps={{ shrink: true }}
                                 sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                       borderRadius: 2
                                    }
                                 }}
                              />
                           </Grid>
                        </Grid>
                     </Box>
                  </Box>
               )}
               
               <TextField
                  select
                  fullWidth
                  label="Chọn phòng mới"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  sx={{
                     '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                     }
                  }}
               >
                  {availableRooms?.data?.map((room: any) => (
                     <MenuItem 
                        key={room.room_id}
                        value={room.room_id}
                        disabled={room.status === 'Có người đặt' || room.room_id === selectedRoom?.room_id}
                        sx={{
                           py: 1.5,
                           px: 2,
                           borderRadius: 1,
                           mb: 0.5,
                           '&:hover': {
                              bgcolor: 'primary.lighter'
                           },
                           '&.Mui-disabled': {
                              opacity: 0.7,
                              bgcolor: 'grey.100'
                           }
                        }}
                     >
                        <Box sx={{ width: '100%' }}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={500}>
                                 {room.name}
                              </Typography>
                              <Typography 
                                 variant="body2" 
                                 color="primary.main"
                                 fontWeight={500}
                              >
                                 {Number(room.price).toLocaleString()}đ/giờ
                              </Typography>
                           </Box>
                           
                           <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <FiberManualRecordIcon 
                                 sx={{ 
                                    mr: 0.5, 
                                    fontSize: 12,
                                    color: room.status === 'Có người đặt' ? 'error.main' : 'success.main'
                                 }} 
                              />
                              <Typography 
                                 variant="caption"
                                 color={room.status === 'Có người đặt' ? 'error.main' : 'success.main'}
                              >
                                 {room.status}
                              </Typography>
                           </Box>
                        </Box>
                     </MenuItem>
                  ))}
               </TextField>
            </Box>
         </DialogContent>
         <DialogActions>
            <Button onClick={() => {
               setChangeRoomOpen(false);
               setSelectedRoom(null);
               setNewRoomId('');
               setNewStartTime('');
               setNewEndTime('');
            }}>
               Hủy
            </Button>
            <Button 
               variant="contained" 
               onClick={handleChangeRoom}
               disabled={!newRoomId || isChangingRoom}
            >
               {isChangingRoom ? 'Đang xử lý...' : 'Xác nhận đổi phòng'}
            </Button>
         </DialogActions>
      </Dialog>
   );

   // Kiểm tra có dữ liệu không
   const hasRooms = order?.rooms && order.rooms.length > 0;
   const hasProducts = order?.products && order.products.length > 0;

   // Thêm state và query cho yêu cầu gia hạn
   const [extendRequestDialogOpen, setExtendRequestDialogOpen] = useState(false);
   const [selectedRequest, setSelectedRequest] = useState<any>(null);

   // Query để lấy danh sách y��u cầu gia hạn cho đơn hàng cụ thể
   const { data: extendRequests } = useQuery({
      queryKey: ['extend-requests', id],
      queryFn: () => getRequest(`/order/extend-requests/${id}`),
      enabled: !!id
   });

   // Lấy unpaidAmount trực tiếp từ response API
   const unpaidAmount = extendRequests?.unpaidAmount || 0;

   // Mutation để xử lý yêu cầu
   const { mutate: handleExtendRequest } = useMutation({
      mutationFn: (data: { request_id: number; status: 'APPROVED' | 'REJECTED' }) =>
         postRequest('/order/approve-extend-room', data),
      onSuccess: () => {
         queryClient.invalidateQueries(['extend-requests', id]);
         toast.success('Đã xử lý yêu cầu gia hạn');
      },
   });

   // Thêm mutation cho update payment
   const { mutate: updatePaymentStatus } = useMutation({
      mutationFn: (requestId: number) => 
         putRequest('/order/extend-payment', { request_id: requestId }),
      onSuccess: () => {
         toast.success('Đã cập nhật trạng thái thanh toán');
         // Invalidate cả 2 query để cập nhật dữ liệu ngay lập tức
         queryClient.invalidateQueries(['extend-requests', id]);
         queryClient.invalidateQueries(['order-detail', id]); 
      },
      onError: (error: any) => {
         toast.error('Lỗi khi cập nhật trạng thái thanh toán');
         console.error('Update payment status error:', error);
      }
   });

   // Thêm component ExtendRequestDialog
   const ExtendRequestDialog = () => (
      <Dialog 
         open={extendRequestDialogOpen} 
         onClose={() => setExtendRequestDialogOpen(false)}
         maxWidth="sm"
         fullWidth
      >
         <DialogTitle>
            Chi tiết yêu cầu gia hạn
         </DialogTitle>
         <DialogContent>
            {selectedRequest && (
               <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                     Thông tin phòng:
                  </Typography>
                  <Typography variant="body2">
                     Tên phòng: {selectedRequest.room_name}
                  </Typography>
                  <Typography variant="body2">
                     Thời gian hiện tại: {dayjs(selectedRequest.start_time).format('DD/MM/YYYY HH:mm')} - 
                     {dayjs(selectedRequest.end_time).format('DD/MM/YYYY HH:mm')}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                     Thông tin gia hạn:
                  </Typography>
                  <Typography variant="body2">
                     Số giờ gia hạn: {selectedRequest.additional_hours} giờ
                  </Typography>
                  <Typography variant="body2">
                     Phí gia hạn: {selectedRequest.additional_price.toLocaleString()}đ
                  </Typography>
                  <Typography variant="body2">
                     Thời gian yêu cầu: {dayjs(selectedRequest.created_at).format('DD/MM/YYYY HH:mm')}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                     Thông tin khách hàng:
                  </Typography>
                  <Typography variant="body2">
                     Tên: {selectedRequest.username}
                  </Typography>
                  <Typography variant="body2">
                     Email: {selectedRequest.email}
                  </Typography>
                  <Typography variant="body2">
                     SĐT: {selectedRequest.phone}
                  </Typography>
               </Box>
            )}
         </DialogContent>
         <DialogActions>
            <Button onClick={() => setExtendRequestDialogOpen(false)}>
               Đ��ng
            </Button>
            {selectedRequest?.request_status === 'PENDING' && (
               <>
                  <Button
                     color="error"
                     onClick={() => handleExtendRequest({
                        request_id: selectedRequest.request_id,
                        status: 'REJECTED'
                     })}
                  >
                     Từ chối
                  </Button>
                  <Button
                     variant="contained"
                     onClick={() => handleExtendRequest({
                        request_id: selectedRequest.request_id,
                        status: 'APPROVED'
                     })}
                  >
                     Duyệt yêu cầu
                  </Button>
               </>
            )}
         </DialogActions>
      </Dialog>
   );

   // Thêm section hiển thị yêu cầu gia hạn
   return (
      <BaseBreadcrumbs arialabel="Chi tiết hóa đơn" breadcrumbs={breadcrumbs}>
         {/* Actions Section */}
         <Box display="flex" justifyContent="space-between" my={3}>
            {currentStatus !== 'CANCELLED' && currentStatus !== 'CHECKED_OUT' && (
               <Button
                  variant="contained"
                  color={statusButtonColors[nextStatus as never] || 'primary'} // Default to 'primary' if no color is found
                  sx={{ px: 4 }}
                  onClick={() => mutate()}
               >
                  {ORDER_STATUS_LABELS[nextStatus as never]}
               </Button>
            )}

            {currentStatus !== 'CANCELLED' && currentStatus !== 'CHECKED_OUT' && currentStatus !== 'CHECKED_IN' && (
               <Button variant="outlined" color="secondary" sx={{ px: 4 }}   onClick={() => mutateCancel()}>
                  Hủy hóa đơn
               </Button>
            )}

         </Box>
         {/* Order Overview Section */}
         <Card 
            sx={{ 
               mb: 3,
               borderRadius: 2,
               boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
               border: 'none'
            }}
         >
            <CardHeader 
               title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                     <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} />
                     <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Thông tin đặt hàng
                     </Typography>
                  </Box>
               }
               sx={{
                  borderBottom: '1px solid #eee',
                  bgcolor: '#f8f9fa',
                  p: 2.5
               }}
            />
            <CardContent sx={{ p: 3 }}>
               <Grid container spacing={3}>
                  <Grid item xs={6}>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <ConfirmationNumberIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                           <Typography variant="body1" color="text.secondary">
                              Mã đơn hàng: 
                              <Typography component="span" sx={{ ml: 1, fontWeight: 600 }}>
                                 #{order?.order_id}
                              </Typography>
                           </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                           <Typography variant="body1" color="text.secondary">
                              Ngày đặt:
                              <Typography component="span" sx={{ ml: 1, fontWeight: 500 }}>
                                 {dayjs(order?.order_date).format('DD-MM-YYYY HH:mm:ss')}
                              </Typography>
                           </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <CircleIcon sx={{ 
                              mr: 1, 
                              fontSize: 20,
                              color: order?.order_status === 'CHECKED_OUT' ? 'success.main' 
                                 : order?.order_status === 'CANCELLED' ? 'error.main'
                                 : 'warning.main'
                           }} />
                           <Typography variant="body1" color="text.secondary">
                              Trạng thái:
                              <Typography 
                                 component="span" 
                                 sx={{ 
                                    ml: 1,
                                    fontWeight: 600,
                                    color: order?.order_status === 'CHECKED_OUT' ? 'success.main' 
                                       : order?.order_status === 'CANCELLED' ? 'error.main'
                                       : 'warning.main'
                                 }}
                              >
                                 {order?.order_status}
                              </Typography>
                           </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <PaidIcon sx={{ mr: 1, color: 'error.main', fontSize: 20 }} />
                           <Typography variant="body1" color="text.secondary">
                              Tổng tiền:
                              <Typography component="span" sx={{ ml: 1, fontWeight: 600, color: 'error.main' }}>
                                 {formatPrice(order?.total_amount)} đ
                              </Typography>
                           </Typography>
                        </Box>
                     </Box>
                  </Grid>

                  <Grid item xs={6}>
                     <Box 
                        sx={{ 
                           display: 'flex', 
                           flexDirection: 'column', 
                           gap: 2,
                           height: '100%',
                           bgcolor: 'primary.lighter',
                           borderRadius: 2,
                           p: 2
                        }}
                     >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <PersonIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                           <Typography variant="body1" color="text.secondary">
                              Người đặt:
                              <Typography component="span" sx={{ ml: 1, fontWeight: 500 }}>
                                 {order?.user?.username}
                              </Typography>
                           </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <EmailIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                           <Typography variant="body1" color="text.secondary">
                              Email:
                              <Typography component="span" sx={{ ml: 1, fontWeight: 500 }}>
                                 {order?.user?.email}
                              </Typography>
                           </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <StarsIcon sx={{ 
                              mr: 1, 
                              color: order?.user?.is_vip ? 'warning.main' : 'text.secondary',
                              fontSize: 20 
                           }} />
                           <Typography variant="body1" color="text.secondary">
                              Trạng thái:
                              <Typography 
                                 component="span" 
                                 sx={{ 
                                    ml: 1,
                                    fontWeight: 600,
                                    color: order?.user?.is_vip ? 'warning.main' : 'text.secondary'
                                 }}
                              >
                                 {order?.user?.is_vip ? `VIP (Hết hạn: ${order.user.vip_end_date})` : 'Thường'}
                              </Typography>
                           </Typography>
                        </Box>
                     </Box>
                  </Grid>
               </Grid>
            </CardContent>
         </Card>

         {/* Hiển thị phần có dữ liệu trước */}
         {hasRooms && (
            <>
               <Typography variant="h5" sx={{ mb: 2 }}>Chi tiết đặt phòng</Typography>
               <TableContainer>
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Tên phòng</TableCell>
                           <TableCell>Thời gian vào</TableCell>
                           <TableCell>Thời gian ra</TableCell>
                           <TableCell>Số giờ</TableCell>
                           <TableCell>Total Price</TableCell>
                           <TableCell>Thao tác</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {order.rooms.map((room) => (
                           <TableRow key={room.id}>
                              <TableCell>{room.room_name}</TableCell>
                              <TableCell align="center">
                                 {dayjs(room.start_time).format('DD-MM-YYYY HH:mm:ss')}
                              </TableCell>
                              <TableCell align="center">
                                 {dayjs(room.end_time).format('DD-MM-YYYY HH:mm:ss')}
                              </TableCell>
                              <TableCell align="center">{room.total_time}</TableCell>
                              <TableCell align="center">{formatPrice(room.total_price)} đ</TableCell>
                              <TableCell align="center">
                                 {currentStatus !== 'CHECKED_OUT' && currentStatus !== 'CANCELLED' && (
                                    <IconButton
                                       onClick={() => handleRoomChange(room)}
                                       sx={{
                                          color: 'primary.main',
                                          '&:hover': {
                                             backgroundColor: 'rgba(0, 127, 255, 0.08)'
                                          }
                                       }}
                                    >
                                       <SwapHorizIcon />
                                    </IconButton>
                                 )}
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </TableContainer>
            </>
         )}

         {hasProducts && (
            <>
               <Typography variant="h5" sx={{ mt: hasRooms ? 4 : 0, mb: 2 }}>Chi tiết sản phẩm</Typography>
               <TableContainer>
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Tên sản phẩm</TableCell>
                           <TableCell>Danh mục</TableCell>
                           <TableCell>Số lượng</TableCell>
                           <TableCell>Giá</TableCell>
                           <TableCell>Tổng tiền</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {order.products.map((product) => (
                           <TableRow key={product.id}>
                              <TableCell>{product.product_name}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>{product.quantity}</TableCell>
                              <TableCell>{formatPrice(product.price)} đ</TableCell>
                              <TableCell>{formatPrice(product.total_price)} đ</TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </TableContainer>
            </>
         )}

         {/* Hiển thị phần không có dữ liệu sau */}
         {!hasRooms && (
            <>
               <Typography variant="h5" sx={{ mt: hasProducts ? 4 : 0, mb: 2 }}>Chi tiết đặt phòng</Typography>
               <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 3 }}>
                  Chưa đặt phòng
               </Typography>
            </>
         )}

         {!hasProducts && (
            <>
               <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Chi tiết sản phẩm</Typography>
               <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Chưa đặt sản phẩm
               </Typography>
            </>
         )}

         <RoomChangeDialog />
         <ExtendRequestDialog />

         {/* Thêm section yêu cầu gia hạn sau phần chi tiết đặt phòng */}
         {hasRooms && extendRequests?.data?.length > 0 && (
            <>
               <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Yêu cầu gia hạn</Typography>
               <TableContainer>
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Tên phòng</TableCell>
                           <TableCell>Số giờ gia hạn</TableCell>
                           <TableCell>Phí gia hạn</TableCell>
                           <TableCell>Thời gian yêu cầu</TableCell>
                           <TableCell>Trạng thái</TableCell>
                           <TableCell>Thanh toán</TableCell>
                           <TableCell>Thao tác</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {extendRequests.data.map((request: any) => (
                           <TableRow key={request.id}>
                              <TableCell>{request.room_name}</TableCell>
                              <TableCell>{request.additional_hours} giờ</TableCell>
                              <TableCell>{formatPrice(request.additional_price)} đ</TableCell>
                              <TableCell>
                                 {dayjs(request.created_at).format('DD/MM/YYYY HH:mm')}
                              </TableCell>
                              <TableCell>
                                 <Chip
                                    label={
                                       request.request_status === 'PENDING'
                                          ? 'Chờ duyệt'
                                          : request.request_status === 'APPROVED'
                                          ? 'Đã duyệt'
                                          : 'Đã từ chối'
                                    }
                                    color={
                                       request.request_status === 'PENDING'
                                          ? 'warning'
                                          : request.request_status === 'APPROVED'
                                          ? 'success'
                                          : 'error'
                                    }
                                 />
                              </TableCell>
                              <TableCell>
                                 {request.request_status === 'APPROVED' && (
                                    <Chip
                                       label={request.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                       color={request.payment_status === 'PAID' ? 'success' : 'warning'}
                                       onClick={() => {
                                          if (request.payment_status === 'UNPAID') {
                                             updatePaymentStatus(request.id);
                                          }
                                       }}
                                       sx={{ cursor: request.payment_status === 'UNPAID' ? 'pointer' : 'default' }}
                                    />
                                 )}
                              </TableCell>
                              <TableCell>
                                 {request.request_status === 'PENDING' && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                       <Button
                                          size="small"
                                          variant="contained"
                                          color="success"
                                          onClick={() => handleExtendRequest({
                                             request_id: request.id,
                                             status: 'APPROVED'
                                          })}
                                       >
                                          Duyệt
                                       </Button>
                                       <Button
                                          size="small"
                                          variant="contained"
                                          color="error"
                                          onClick={() => handleExtendRequest({
                                             request_id: request.id,
                                             status: 'REJECTED'
                                          })}
                                       >
                                          Từ chối
                                       </Button>
                                    </Box>
                                 )}
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </TableContainer>
            </>
         )}

         {unpaidAmount > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
               <Typography color="warning.dark" fontWeight="medium">
                  Phí gia hạn chưa thanh toán: {formatPrice(unpaidAmount)}đ
               </Typography>
            </Box>
         )}
      </BaseBreadcrumbs>
   );
};

export default OrderDetail;
