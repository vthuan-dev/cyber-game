import BaseModel from "./base.model";
import bcrypt from "bcrypt";

class UserModel extends BaseModel {
  constructor() {
    super({
      table: "user",
      fillable: [
        "id",
        "username",
        "email",
        "phone",
        "password",
        "vip_end_date",
        "vip_start_date",
        "is_vip",
        "user_type",
      ],
    });
  }

  //   mã hóa mật password
  async bcryptPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  //   so sánh === password
  async authenticate(inputPassword, hashedPassword) {
    console.log('Input password:', inputPassword);  // admin123
    console.log('Hashed password from DB:', hashedPassword); // $2b$10$S53r...
    const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
    console.log('bcrypt compare result:', isMatch); // true/false
    return isMatch;
  }

  async updateById(id, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);

    // Tạo câu truy vấn SQL
    const setClause = keys.map((key) => `${key} = ?`).join(", "); // Tạo chuỗi cho phần SET
    const query = `UPDATE ${this.table} SET ${setClause} WHERE id = ?`;

    // Kết hợp các giá trị vào một mảng
    const params = [...values, id];

    console.log("Query:", query);
    console.log("Params:", params);

    try {
      // Sử dụng promise version của query
      const [result] = await this.connection.promise().query(query, params); // Đảm bảo gọi promise()

      console.log("Execution Result:", result); // Log toàn bộ kết quả

      // Kiểm tra cấu trúc của kết quả
      if (result && typeof result === "object") {
        // Truy cập vào affectedRows
        const affectedRows = result.affectedRows;

        return affectedRows > 0 ? updates : null; // Trả về thông tin bản ghi đã cập nhật
      } else {
        console.error("Unexpected result format:", result);
        throw new Error("Unexpected result format");
      }
    } catch (error) {
      console.error("Error executing update query: ", error);
      throw error; // Ném lại lỗi để xử lý trong controller
    }
  }

  // Thêm phương thức kiểm tra email tồn tại
  async findByEmail(email) {
    try {
      const [rows] = await this.connection.promise().query(
        `SELECT * FROM ${this.table} WHERE email = ?`,
        [email]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error checking email:", error);
      throw error;
    }
  }

  async findOne(conditions) {
    try {
      // Nếu conditions là object
      if (typeof conditions === 'object') {
        const keys = Object.keys(conditions);
        const values = Object.values(conditions);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        
        const [rows] = await this.connection.promise().query(
          `SELECT * FROM ${this.table} WHERE ${whereClause} LIMIT 1`,
          values
        );
        return rows[0] || null;
      }
      
      // Nếu conditions là string (trường hợp cũ)
      const [rows] = await this.connection.promise().query(
        `SELECT * FROM ${this.table} WHERE ${conditions} LIMIT 1`
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error in findOne:", error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      console.log("Creating user with data:", userData);
      
      // Loại bỏ passwordConfirm từ userData
      const { passwordComfirm, ...userDataToSave } = userData;
      
      // Kiểm tra email và username tồn tại
      const existingEmail = await this.findOne({ email: userDataToSave.email });
      if (existingEmail) {
        throw {
          status: 400,
          message: "Email đã được sử dụng"
        };
      }

      const existingUsername = await this.findOne({ username: userDataToSave.username });
      if (existingUsername) {
        throw {
          status: 400,
          message: "Username đã được sử dụng"
        };
      }

      // Hash password
      const hashedPassword = await this.bcryptPassword(userDataToSave.password);

      // Tạo user mới với password đã hash
      const newUserData = {
        ...userDataToSave,
        password: hashedPassword,
        is_vip: 0,
        user_type: 0, // 0: normal user, 1: admin
        created_at: new Date()
      };

      // Thực hiện insert
      const [result] = await this.connection.promise().query(
        `INSERT INTO ${this.table} SET ?`,
        [newUserData]
      );

      console.log("Insert result:", result);

      // Trả về user đã tạo (không bao gồm password)
      return {
        id: result.insertId,
        ...newUserData,
        password: undefined
      };

    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
}

export default new UserModel();
