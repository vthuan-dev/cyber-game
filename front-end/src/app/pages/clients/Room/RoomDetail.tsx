import 'RoomDetail.css';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import ComputerIcon from '@mui/icons-material/Computer';
import { LazyLoadingImage } from '@components';
import noImage from '@assets/images/no-image.png';
import { getRequest } from '~/app/configs';
import Loading from '@components/Loading';

const RoomDetail = () => {
   const { id } = useParams();
   
   const { data: roomDetail, isLoading } = useQuery({
      queryKey: ['room-detail', id],
      queryFn: () => getRequest(`/room/searchById/${id}`),
      enabled: !!id
   });

   if (isLoading) return <Loading />;

   const room = roomDetail?.data;
   const description = room?.description ? JSON.parse(room.description) : [];

   return (
      <div className="room-detail-container">
         <div className="room-detail-wrapper">
            {/* Phần hình ảnh */}
            <div className="room-image">
               <LazyLoadingImage
                  width="100%"
                  height="400px"
                  className="lazyload loaded main-image"
                  src={room?.image_url ?? noImage}
                  alt={room?.room_name}
               />
            </div>

            {/* Phần thông tin */}
            <div className="room-info">
               <h1 className="room-name">{room?.room_name}</h1>
               
               <div className="price-box">
                  <span className="current-price">{room?.price?.toLocaleString()}đ/1h</span>
               </div>

               <div className="room-specs">
                  <div className="spec-item">
                     <span className="spec-label">Số lượng máy:</span>
                     <span className="spec-value">{room?.capacity} máy</span>
                  </div>

                  {description.map((item: any, index: number) => (
                     <div className="spec-item" key={index}>
                        <span className="spec-label">{item.label}:</span>
                        <span className="spec-value">{item.value}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Phần danh sách máy */}
         <div className="computers-section">
            <h2 className="section-title">Danh sách máy trong phòng</h2>
            <div className="computers-grid">
               {Array.from({ length: room?.capacity || 0 }).map((_, index) => (
                  <div className="computer-item" key={index}>
                     <div className="computer-card">
                        <ComputerIcon className="computer-icon" />
                        <span className="computer-number">Máy {index + 1}</span>
                        <span className="computer-status available">Sẵn sàng</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default RoomDetail;