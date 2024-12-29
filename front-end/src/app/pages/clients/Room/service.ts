import { useQuery } from '@tanstack/react-query';
import { getRequest } from '~/app/configs/request';

// API lấy chi tiết phòng
export const useGetRoomDetail = (id: string | undefined) => {
   return useQuery({
      queryKey: ['room-detail', id],
      queryFn: () => getRequest(`/room/detail/${id}`),
      enabled: !!id
   });
}; 