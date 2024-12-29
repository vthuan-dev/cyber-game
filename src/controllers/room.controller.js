import { getPagination } from "../helpers/getPagination";
import { responseError, responseSuccess } from "../helpers/response";
import orderModel from "../models/order.model";
import roomModel from "../models/room.model";

export const getAll = async (req, res) => {
  try {
    const { query } = req;

    const { isPagination, ...pagination } = await getPagination(
      roomModel,
      query
    );

    const product = await roomModel.read(query, isPagination);

    const data = {
      message: "Lấy danh sách thành công.",
      data: product,
      pagination,
    };
    responseSuccess(res, data);
  } catch (error) {
    return responseError(res, error);
  }
};

export const create = async (req, res) => {
  try {
    const body = req.body;
    // const { error } = AuthValidator.validatorRegister(req.body);
    // if (error) {
    //   return responseError(res, error);
    // }
    // status: 0: trống - 1: đang sử dụng
    const result = await roomModel.create({ ...body, status: "INACTIVE" });

    const response = {
      data: result,
      message: "Tạo mới thành công",
    };
    responseSuccess(res, response);
  } catch (error) {
    return responseError(res, error);
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const updatedCategory = await roomModel.update("id", id, body);
    const response = {
      message: "Cập nhật dữ liệu thành công",
      data: updatedCategory,
    };
    return responseSuccess(res, response);
  } catch (error) {
    return responseError(res, error);
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;

    // SQL query to fetch the room and associated desktops
    const query = `
      SELECT room.id AS room_id, room.room_name, room.status AS room_status, room.position,
             room.image_url, room.capacity, room.price AS room_price, room.description AS room_description,
             desktop.id AS desktop_id, desktop.desktop_name, desktop.price AS desktop_price, 
             desktop.status AS desktop_status, desktop.description AS desktop_description
      FROM cybergame.room
      LEFT JOIN cybergame.desktop ON room.id = desktop.room_id
      WHERE room.id = ?;
    `;

    // Execute the SQL query
    const [result] = await roomModel.connection.promise().query(query, [id]);

    // Check if room exists
    if (!result || result.length === 0) {
      return responseNotFound(res);
    }

    // Format the response data
    const roomData = {
      room_id: result[0].room_id,
      room_name: result[0].room_name,
      room_status: result[0].room_status,
      position: result[0].position,
      image_url: result[0].image_url,
      capacity: result[0].capacity,
      room_price: result[0].room_price,
      room_description: result[0].room_description,
      desktops: result
        .map((desktop) => ({
          desktop_id: desktop.desktop_id,
          desktop_name: desktop.desktop_name,
          desktop_price: desktop.desktop_price,
          desktop_status: desktop.desktop_status,
          desktop_description: desktop.desktop_description,
        }))
        .filter((desktop) => desktop.desktop_id !== null), // Filter out empty desktop records
    };

    const data = {
      message: "Lấy dữ liệu thành công",
      data: roomData,
    };

    return responseSuccess(res, data);
  } catch (error) {
    console.error("Error:", error);
    return responseError(res, error);
  }
};

export const deleteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra phòng có tồn tại
    const room = await roomModel.findById(id);
    if (!room) {
      return responseError(res, {
        message: "Không tìm thấy phòng",
        statusCode: 404
      });
    }

    // Kiểm tra chi tiết về việc sử dụng phòng
    const checkUsageQuery = `
      SELECT 
        (SELECT COUNT(*) FROM room_order_detail rod
         JOIN orders o ON rod.order_id = o.id
         WHERE rod.room_id = ? 
         AND o.status IN ('PENDING', 'CHECKED_IN')
         AND rod.end_time > NOW()) as activeBookings,
        (SELECT COUNT(*) FROM cart 
         WHERE room_id = ?) as cartItems
    `;
    
    const [[usage]] = await roomModel.connection
      .promise()
      .query(checkUsageQuery, [id, id]);

    // Kiểm tra và trả về thông báo chi tiết
    if (usage.activeBookings > 0) {
      return responseError(res, {
        message: "Không thể xóa phòng vì đang có người đặt hoặc đang sử dụng",
        details: {
          activeBookings: usage.activeBookings
        },
        statusCode: 400
      });
    }

    if (usage.cartItems > 0) {
      return responseError(res, {
        message: "Không thể xóa phòng vì đang có trong giỏ hàng của khách",
        details: {
          cartItems: usage.cartItems
        },
        statusCode: 400
      });
    }

    // Thực hiện xóa theo thứ tự để tránh lỗi khóa ngoại
    const deleteQueries = [
      // 1. Xóa các mục trong giỏ hàng liên quan đến phòng
      'DELETE FROM cart WHERE room_id = ?',
      
      // 2. Xóa các máy tính trong phòng
      'DELETE FROM desktop WHERE room_id = ?',
      
      // 3. Xóa lịch sử đặt phòng đã hoàn thành
      `DELETE rod FROM room_order_detail rod
       JOIN orders o ON rod.order_id = o.id
       WHERE rod.room_id = ? AND o.status = 'COMPLETED'`,
      
      // 4. Cuối cùng xóa phòng
      'DELETE FROM room WHERE id = ?'
    ];

    // Thực hiện các câu query xóa trong transaction
    await roomModel.connection.promise().beginTransaction();
    
    try {
      for (const query of deleteQueries) {
        await roomModel.connection.promise().query(query, [id]);
      }
      
      await roomModel.connection.promise().commit();
      
      return responseSuccess(res, {
        message: "Xóa phòng thành công",
        data: { id }
      });
      
    } catch (error) {
      await roomModel.connection.promise().rollback();
      throw error;
    }

  } catch (error) {
    console.error("Error deleting room:", error);
    return responseError(res, {
      message: "Lỗi khi xóa phòng",
      error: error.message,
      statusCode: 500
    });
  }
};

export const getAllRoomCountDesktop = async (req, res) => {
  try {
    console.log(1);

    // Câu truy vấn SQL
    const query = `
      SELECT room.id, room.room_name, room.capacity, COUNT(desktop.room_id) AS desktop_count
      FROM cybergame.room
      LEFT JOIN cybergame.desktop ON room.id = desktop.room_id
      GROUP BY room.id, room.room_name, room.capacity;
    `;

    const [result] = await roomModel.connection.promise().query(query);

    const data = {
      message: "Lấy dữ liệu thành công",
      data: result,
    };
    return responseSuccess(res, data);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
export const getAllTimeLine = async (req, res) => {
  try {

    // Câu truy vấn SQL
    const query = ` 
    SELECT 
    room.id,
    room.room_name, 
    room.capacity,
    COUNT(DISTINCT desktop.room_id) AS desktop_count,
    GROUP_CONCAT(
        CONCAT(
            DATE_FORMAT(rod.start_time, '%d-%m-%Y %H:%i')," - ",
             DATE_FORMAT(rod.end_time, '%d-%m-%Y %H:%i')
        ) SEPARATOR ';'
    ) AS booking_times
FROM cybergame.room
LEFT JOIN cybergame.desktop ON room.id = desktop.room_id
LEFT JOIN cybergame.room_order_detail rod ON room.id = rod.room_id
WHERE rod.start_time > NOW()
GROUP BY 
    room.id, 
    room.room_name, 
    room.capacity
ORDER BY room.id;
    `;

    const [result] = await roomModel.connection.promise().query(query);

    const data = {
      message: "Lấy dữ liệu thành công",
      data: result,
    };
    return responseSuccess(res, data);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const getAllRoomsWithOrders = async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Lấy thông tin phân trang từ query params
  const offset = (page - 1) * limit; // Tính toán offset cho phân trang

  try {
    const query = `
      SELECT 
        r.id AS room_id,
        r.room_name,
        r.status AS room_status,
        r.position,
        r.image_url,
        r.capacity,
        r.price,
        r.description,
        
        o.id AS order_id,
        o.user_id,
        o.total_money AS total_amount,
        o.created_at AS order_date,
        o.status AS order_status,
        
        u.username,
        u.email,
        u.is_vip,
        u.vip_end_date,
        
        rod.start_time AS room_start_time,
        rod.end_time AS room_end_time,
        rod.total_time AS room_total_time,
        rod.total_price AS room_total_price

      FROM room r
      LEFT JOIN room_order_detail rod ON r.id = rod.room_id
      LEFT JOIN orders o ON rod.order_id = o.id AND o.status = 'CHECKED_IN'  -- Lọc theo trạng thái CHECKED_IN
      LEFT JOIN \`user\` u ON o.user_id = u.id

      LIMIT ? OFFSET ?;  -- Phân trang
    `;

    const [rows] = await roomModel.connection
      .promise()
      .query(query, [parseInt(limit, 10), parseInt(offset, 10)]);

    // Lấy tổng số phòng để tính toán phân trang
    const totalQuery = `SELECT COUNT(*) AS total FROM room;`;
    const [[{ total }]] = await roomModel.connection
      .promise()
      .query(totalQuery);

    const response = rows.map((row) => ({
      room_id: row.room_id,
      room_name: row.room_name,
      room_status: row.room_status,
      position: row.position,
      image_url: row.image_url,
      capacity: row.capacity,
      price: row.price,
      description: row.description,
      order: row.order_id
        ? {
            order_id: row.order_id,
            user_id: row.user_id,
            total_amount: row.total_amount,
            order_date: row.order_date,
            order_status: row.order_status,
            user: {
              username: row.username,
              email: row.email,
              is_vip: row.is_vip,
              vip_end_date: row.vip_end_date,
            },
            room_details: {
              start_time: row.room_start_time,
              end_time: row.room_end_time,
              total_time: row.room_total_time,
              total_price: row.room_total_price,
            },
          }
        : null, // Nếu không có đơn, trả về null
    }));

    // Tính toán phân trang
    const pagination = {
      total_items: total,
      total_pages: Math.ceil(total / limit),
      current_page: Number(page),
      limit: Number(limit),
    };

    const data = {
      message: "Lấy dữ liệu thành công",
      data: response,
      pagination,
    };

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi", error });
  }
};
