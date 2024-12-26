/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/naming-convention */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Box, Chip, IconButton, Pagination, Typography } from '@mui/material';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { getNextStatus, ORDER_STATUS_LABELS, statusButtonColors, type OrderStatusKey } from './OrderDetail';

import { getRequest } from '~/app/configs';
import BaseBreadcrumbs from '@components/design-systems/BaseBreadcrumbs/BaseBreadcrumbs';
import { ROUTE_PATH } from '@constants';
import { ScrollbarBase } from '@components/design-systems/ScrollbarBase';
import { useSearchParamsHook } from '@hooks';

// Breadcrumb data
const breadcrumbs = [
   {
      title: 'Trang Chủ',
      link: ROUTE_PATH.ADMIN_HOME,
   },
];

const Order = () => {
   const { setParams, searchParams } = useSearchParamsHook();

   // Cập nhật hàm query để xử lý đúng định dạng response
   const { data: orders, isLoading } = useQuery<ResponseGetList<OrderItem>>({
      queryKey: ['orders', searchParams.page],
      queryFn: async () => {
         const queryParam = new URLSearchParams({
            page: String(searchParams.page ?? 1),
            limit: String(10),
            isPagination: String(true),
         });
         const response = await getRequest(`/order?${queryParam}`);
         // Đảm bảo trả về đúng cấu trúc dữ liệu
         return {
            data: response.data,
            pagination: response.pagination,
            message: response.message,
            success: response.success
         };
      },
      enabled: true,
   });

   // Thêm xử lý loading state
   if (isLoading) {
      return <Box>Loading...</Box>;
   }

   // Cập nhật logic sắp xếp để xử lý định dạng API response
   const sortedOrders = React.useMemo(() => {
      if (!orders?.data) return [];
      return [...orders.data].sort((a, b) => {
         const dateA = dayjs(b.created_at || b.order_date);
         const dateB = dayjs(a.created_at || a.order_date);
         return dateA.valueOf() - dateB.valueOf();
      });
   }, [orders?.data]);

   // Default values for pagination
   const currentPage = searchParams.page ?? 1;
   const totalPage = orders?.pagination?.totalPage ?? 1;

   // Cập nhật cell hiển thị trạng thái
   const renderStatus = (status: OrderStatusKey) => {
      return (
         <Chip
            label={ORDER_STATUS_LABELS[status] || 'Không xác định'}
            color={statusButtonColors[status] || 'default'}
            sx={{
               borderRadius: '6px',
               fontWeight: 500,
               fontSize: '0.85rem'
            }}
         />
      );
   };

   return (
      <BaseBreadcrumbs arialabel="Hóa đơn" breadcrumbs={breadcrumbs}>
         <Box sx={{ 
            background: 'linear-gradient(135deg, #1a1f3c 0%, #141728 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            overflow: 'hidden'
         }}>
            <TableContainer>
               <ScrollbarBase
                  sx={{
                     width: '100%',
                     height: '500px',
                     '&::-webkit-scrollbar': {
                        width: '6px',
                        height: '6px',
                     },
                     '&::-webkit-scrollbar-track': {
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '3px',
                     },
                     '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        '&:hover': {
                           background: 'rgba(255,255,255,0.15)',
                        }
                     }
                  }}
               >
                  <Table sx={{ width: '100%' }}>
                     <TableHead>
                        <TableRow sx={{
                           background: 'rgba(255,255,255,0.02)',
                           borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }} width={50}>STT</TableCell>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }}>Mã hóa đơn</TableCell>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }}>Khách hàng</TableCell>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }}>Tổng Tiền</TableCell>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }}>Trạng thái</TableCell>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }}>Ngày tạo</TableCell>
                           <TableCell sx={{ 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '16px',
                              borderBottom: 'none'
                           }} width={120}></TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {sortedOrders.length > 0 ? (
                           sortedOrders.map((row, index) => {
                              const currentStatus = row.status as OrderStatusKey;
                              const nextStatus = currentStatus ? getNextStatus(currentStatus) : undefined;
                              
                              return (
                                 <TableRow
                                    key={row.id}
                                    sx={{
                                       transition: 'all 0.3s ease',
                                       '&:hover': {
                                          background: 'rgba(255,255,255,0.02)',
                                       },
                                       '& td': {
                                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                                          padding: '12px 16px',
                                          color: 'rgba(255,255,255,0.7)',
                                       }
                                    }}
                                 >
                                    <TableCell align="center">{index + 1}</TableCell>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.user_id}</TableCell>
                                    <TableCell>
                                       <Typography 
                                          sx={{ 
                                             color: '#00ff88',
                                             fontWeight: 600,
                                             fontSize: '0.95rem'
                                          }}
                                       >
                                          {Number(row.total_money)?.toLocaleString()}đ
                                       </Typography>
                                    </TableCell>
                                    <TableCell>
                                       {renderStatus(row.status as OrderStatusKey)}
                                    </TableCell>
                                    <TableCell>
                                       {dayjs(row.created_at || row.order_date).format('DD-MM-YYYY')}
                                    </TableCell>
                                    <TableCell>
                                       <Link to={ROUTE_PATH.ADMIN_ORDER + '/' + row.id}>
                                          <IconButton
                                             sx={{
                                                color: 'rgba(255,255,255,0.7)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                   color: '#00ff88',
                                                   background: 'rgba(0,255,136,0.1)',
                                                }
                                             }}
                                          >
                                             <RemoveRedEyeIcon />
                                          </IconButton>
                                       </Link>
                                    </TableCell>
                                 </TableRow>
                              );
                           })
                        ) : (
                           <TableRow>
                              <TableCell colSpan={7} align="center">
                                 Không có dữ liệu
                              </TableCell>
                           </TableRow>
                        )}
                     </TableBody>
                  </Table>
               </ScrollbarBase>
            </TableContainer>
         </Box>

         {/* Pagination */}
         <Box 
            sx={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'flex-end',
               gap: 2,
               mt: 3
            }}
         >
            <Typography 
               sx={{
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.7)'
               }}
            >
               Trang {currentPage} trên {totalPage}
            </Typography>
            <Pagination
               count={totalPage}
               page={Number(currentPage)}
               onChange={(_, page) => setParams('page', String(page))}
               sx={{
                  '& .MuiPaginationItem-root': {
                     color: 'rgba(255,255,255,0.7)',
                     border: '1px solid rgba(255,255,255,0.05)',
                     '&.Mui-selected': {
                        background: 'rgba(0,255,136,0.1)',
                        color: '#00ff88',
                        borderColor: '#00ff88',
                     },
                     '&:hover': {
                        background: 'rgba(255,255,255,0.05)',
                     }
                  }
               }}
            />
         </Box>
      </BaseBreadcrumbs>
   );
};

export default Order;
