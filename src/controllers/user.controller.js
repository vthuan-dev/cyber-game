import { roles } from "../config/roles";
import { getPagination } from "../helpers/getPagination";
import { responseError, responseSuccess } from "../helpers/response";
import usersModel from "../models/users.model";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  try {
    res.status(200).json({ message: "Login success", error });
  } catch (error) {
    res.status(200).json({ message: "Login failed", error });
  }
};

export const getAll = async (req, res) => {
  try {
    const { query } = req;

    const { isPagination, ...pagination } = await getPagination(
      usersModel,
      query
    );

    const users = await usersModel.read(res, isPagination);

    const data = {
      message: "Lấy danh sách thành công.",
      data: users,
      pagination,
    };

    responseSuccess(res, data);
  } catch (error) {
    return responseError(res, error);
  }
};

export const create = async (req, res) => {
  try {
    const { password, ...remainBody } = req.body;

    const user = await usersModel.createUser({
      ...remainBody,
      password,
    });

    return responseSuccess(res, {
      message: "Đăng ký tài khoản thành công",
      data: user
    });
  } catch (error) {
    console.error("Create user error:", error);
    
    if (error.status === 400) {
      return responseError(res, {
        status: 400,
        message: error.message
      });
    }
    
    return responseError(res, {
      status: 500,
      message: "Đã xảy ra lỗi khi tạo tài khoản"
    });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usersModel.findOne(res, "id", id);

    const data = {
      message: "Lấy dữ liệu thành công",
      data: await user,
    };
    console.log(data);
    return responseSuccess(res, data);
  } catch (error) {
    return responseError(res, error);
  }
};

export const authorization = async (req, res) => {
  try {
    const auth = req?.auth;

    const user = await usersModel.findOne({ id: auth?.id });

    const dataResponse = {
      success: true,
      message: "Lấy thông tin người dùng thành công.",
      data: user,
    };

    return responseSuccess(res, dataResponse);
  } catch (error) {
    return responseError(res, error);
  }
};

export const getAllUser = async (req, res) => {
  try {
    let conditions = [];
    const { name, is_vip, page = 1, pageSize = 10 } = req.query;

    // Điều kiện lọc cho name và is_vip
    if (name) {
      conditions.push(`username LIKE '%${name}%'`);
    }
    if (is_vip !== undefined) {
      conditions.push(`is_vip = ${is_vip}`);
    }

    // Câu điều kiện WHERE nếu có các điều kiện lọc
    const searchable =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Câu truy vấn SQL để lấy dữ liệu phân trang
    const offset = (page - 1) * pageSize;
    const limit = `LIMIT ${pageSize} OFFSET ${offset}`;
    const query = `SELECT * FROM user ${searchable} ORDER BY created_at DESC ${limit}`;

    // Thực hiện truy vấn để lấy dữ liệu
    const result = await new Promise((resolve, reject) => {
      usersModel.connection.query(query, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result || []);
        }
      });
    });

    // Câu truy vấn SQL để lấy tổng số bản ghi
    const countQuery = `SELECT COUNT(*) AS total FROM user ${searchable}`;
    const totalCountResult = await new Promise((resolve, reject) => {
      usersModel.connection.query(countQuery, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result[0]?.total || 0);
        }
      });
    });

    // Tính toán tổng số trang
    const totalPages = Math.ceil(totalCountResult / pageSize);

    // Gửi dữ liệu phản hồi thành công
    const data = {
      message: "Lấy dữ liệu thành công",
      data: result,
      pagination: {
        totalCount: totalCountResult,
        totalPages,
        currentPage: Number(page),
        pageSize: Number(pageSize),
      },
    };

    return responseSuccess(res, data); // Giả sử responseSuccess là một hàm gửi phản hồi thành công
  } catch (error) {
    console.log("error: ", error);
    return res.status(400).json({ message: "Đã có lỗi xảy ra!!!", error });
  }
};

export const getUserDetail = async (req, res) => {
  try {
    const { id } = req.params; // Lấy id từ tham số đường dẫn

    // Kiểm tra nếu id không được cung cấp
    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    // Câu truy vấn SQL để lấy thông tin chi tiết người dùng
    const query = `SELECT * FROM user WHERE id = ?`;

    // Thực hiện truy vấn để lấy thông tin người dùng
    const result = await new Promise((resolve, reject) => {
      usersModel.connection.query(query, [id], (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result[0] || null); // Chỉ lấy một người dùng
        }
      });
    });

    // Kiểm tra xem người dùng có tồn tại hay không
    if (!result) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Gửi dữ liệu phản hồi thành công
    const data = {
      message: "Lấy dữ liệu thành công",
      data: result,
    };

    return responseSuccess(res, data);
  } catch (error) {
    console.log("error: ", error);
    return res.status(500).json({ message: "Đã có lỗi xảy ra!!!", error });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params; // Lấy id từ params
  const userData = req.body; // Lấy dữ liệu người dùng từ body

  try {
    // Gọi phương thức update của UserModel
    const updatedUser = await usersModel.updateById(id, userData);

    // Kiểm tra nếu người dùng đã được cập nhật
    if (updatedUser) {
      return res.status(200).json({
        message: "User updated successfully",
        data: updatedUser,
      });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, id } = req.body;

    // Lấy thông tin người dùng từ middleware hoặc req.body
    console.log(req.body)
    const userId = id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Tìm người dùng trong cơ sở dữ liệu
    const user = await usersModel.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Xác minh mật khẩu cũ
    // const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    // if (!isPasswordValid) {
    //   console.log(isPasswordValid)
    //   return res.status(400).json({ message: "Old password is incorrect" });
    // }

    // Mã hóa mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    console.log(hashedNewPassword);

    // Cập nhật mật khẩu trong cơ sở dữ liệu
    await usersModel.update("id", userId, { password: hashedNewPassword });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
